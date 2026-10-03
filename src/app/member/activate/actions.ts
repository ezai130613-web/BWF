"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { generateOtpCode, hashOtpCode, otpExpiryDate } from "@/lib/auth/otp";
import { OTP_PURPOSE } from "@/lib/auth/constants";
import { hashPassword, newPasswordSchema, verifyPassword } from "@/lib/auth/password";
import { getBooleanSetting } from "@/lib/settings";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";

/**
 * First sign-in with temporary credentials — members and admins (2026-10-03):
 * verify an email address (6-digit code, unless Super Admin switched that
 * off in Settings), then set a private password. Completing it replaces the
 * temporary password hash and bumps sessionVersion, so the temporary
 * password and every session opened with it stop working at once.
 */

const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_TAKEN_ERROR = "That email address is already linked to another BWF login. Use a different one, or contact BWF.";
const emailSchema = z.email("Enter a valid email address.").transform((v) => v.trim().toLowerCase());

/** Shared by member (/member/activate) and admin (/admin/activate) first sign-in. */
async function requirePendingActivation() {
  const session = await auth();
  if (!session?.user) redirect("/member/login");
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  return { session, user };
}

async function emailTakenByAnotherUser(email: string, userId: string) {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  return Boolean(existing && existing.id !== userId);
}

export async function sendActivationCode(rawEmail: string): Promise<{ error?: string; sent?: boolean }> {
  const { user } = await requirePendingActivation();
  if (!user.mustChangePassword) return { error: "Your account is already activated." };

  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const email = parsed.data;

  if (await emailTakenByAnotherUser(email, user.id)) return { error: EMAIL_TAKEN_ERROR };
  if (!(await rateLimit(`activation-code:${user.id}`, { limit: 6, windowSeconds: 3600 }))) {
    return { error: TOO_MANY_REQUESTS_ERROR };
  }

  const recent = await db.otpChallenge.findFirst({
    where: {
      userId: user.id,
      purpose: OTP_PURPOSE.EMAIL_VERIFY,
      target: email,
      consumedAt: null,
      createdAt: { gte: new Date(Date.now() - CODE_RESEND_COOLDOWN_MS) },
    },
  });
  if (recent) return { error: "A code was just sent — wait a minute before asking for another." };

  const code = generateOtpCode();
  await db.otpChallenge.create({
    data: { userId: user.id, codeHash: hashOtpCode(code), expiresAt: otpExpiryDate(), purpose: OTP_PURPOSE.EMAIL_VERIFY, target: email },
  });

  try {
    await sendEmail({
      to: email,
      subject: "Your Builders World Forum verification code",
      text: `Hello ${user.name},\n\nYour BWF member portal verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    });
  } catch {
    return { error: "We couldn't send the code just now. Check the address and try again in a moment." };
  }

  return { sent: true };
}

const completeSchema = z
  .object({
    email: emailSchema,
    code: z.string().optional(),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "The two passwords don't match.", path: ["confirmPassword"] });

export async function completeActivation(input: {
  email: string;
  code?: string;
  password: string;
  confirmPassword: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const { user } = await requirePendingActivation();
  if (!user.mustChangePassword) return { error: "Your account is already activated." };

  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const { email, code, password } = parsed.data;

  if (await verifyPassword(user.password, password)) {
    return { error: "Choose a new password — not the temporary one you were given." };
  }
  if (await emailTakenByAnotherUser(email, user.id)) return { error: EMAIL_TAKEN_ERROR };

  const requireCode = await getBooleanSetting("memberActivation.requireEmailCode");
  let challengeId: string | null = null;
  if (requireCode) {
    const challenge = await db.otpChallenge.findFirst({
      where: { userId: user.id, purpose: OTP_PURPOSE.EMAIL_VERIFY, target: email, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= challenge.maxAttempts) {
      return { error: "That code has expired or wasn't sent to this address. Request a new one." };
    }
    if (challenge.codeHash !== hashOtpCode((code ?? "").trim())) {
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      return { error: "That code isn't right. Check the email and try again." };
    }
    challengeId = challenge.id;
  }

  const passwordHash = await hashPassword(password);
  try {
    await db.$transaction([
      ...(challengeId ? [db.otpChallenge.update({ where: { id: challengeId }, data: { consumedAt: new Date() } })] : []),
      db.user.update({
        where: { id: user.id },
        data: {
          email,
          emailVerifiedAt: requireCode ? new Date() : null,
          password: passwordHash,
          mustChangePassword: false,
          temporaryPasswordIssuedAt: null,
          sessionVersion: { increment: 1 },
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
    ]);
  } catch {
    // Unique-constraint race on email between the check above and here.
    return { error: EMAIL_TAKEN_ERROR };
  }

  await logActivity({ userId: user.id, action: "member.account_activated", metadata: { emailVerified: requireCode } });
  return { ok: true };
}
