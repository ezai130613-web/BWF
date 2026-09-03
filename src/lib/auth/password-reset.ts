import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateOtpCode, hashOtpCode, otpExpiryDate } from "@/lib/auth/otp";
import { OTP_PURPOSE } from "@/lib/auth/constants";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";

/**
 * Phase 13 (brief §49) — self-service password reset, shared by admin and
 * member login (mirrors src/lib/auth/otp-login.ts's split: one purpose-
 * agnostic implementation, callers only differ by which role keys they
 * allow). Reuses OtpChallenge's generate/hash/expiry primitives from
 * src/lib/auth/otp.ts rather than a parallel token mechanism — the schema
 * comment on OtpChallenge.purpose has said "room for PASSWORD_RESET etc.
 * later" since Phase 2.
 *
 * Kept as sibling functions to requestOtp()/authorizeOtpLogin() rather than
 * extending them — a reset challenge and a login challenge now differ by
 * `purpose`, and authorizeOtpLogin() enforces LOGIN-only (see its own
 * comment) precisely so a leaked reset code can never double as a login
 * credential.
 */

const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

/**
 * Always resolves the same way regardless of whether the account exists, is
 * active, or holds an allowed role — extends otp-login.ts's existing
 * non-enumeration convention (GENERIC_LOGIN_ERROR) to a path that previously
 * never had to hide anything on its *success* side.
 */
export async function requestPasswordReset(email: string, allowedRoleKeys: string[]): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { roles: { include: { role: true } } },
  });

  if (!user || user.status !== "ACTIVE") return;

  const roleKeys = user.roles.map((r) => r.role.key);
  if (!roleKeys.some((key) => allowedRoleKeys.includes(key))) return;

  // Cheap spam guard (no shared rate-limit infra exists in this project —
  // same accepted-gap category as every other public endpoint here): skip
  // sending another code if one was already issued moments ago.
  const recentChallenge = await db.otpChallenge.findFirst({
    where: {
      userId: user.id,
      purpose: OTP_PURPOSE.PASSWORD_RESET,
      consumedAt: null,
      createdAt: { gte: new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentChallenge) return;

  const code = generateOtpCode();
  await db.otpChallenge.create({
    data: {
      userId: user.id,
      codeHash: hashOtpCode(code),
      expiresAt: otpExpiryDate(),
      purpose: OTP_PURPOSE.PASSWORD_RESET,
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Reset your Builders World Forum password",
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email — your password will not be changed.`,
  });

  await logActivity({ userId: user.id, action: "user.password_reset_requested" });
}

const GENERIC_RESET_ERROR = "Invalid or expired code.";

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
  allowedRoleKeys: string[],
): Promise<ResetPasswordResult> {
  const normalizedEmail = email.toLowerCase();

  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { roles: { include: { role: true } } },
  });
  if (!user || user.status !== "ACTIVE") return { ok: false, error: GENERIC_RESET_ERROR };

  const roleKeys = user.roles.map((r) => r.role.key);
  if (!roleKeys.some((key) => allowedRoleKeys.includes(key))) return { ok: false, error: GENERIC_RESET_ERROR };

  const challenge = await db.otpChallenge.findFirst({
    where: { userId: user.id, purpose: OTP_PURPOSE.PASSWORD_RESET, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= challenge.maxAttempts) {
    return { ok: false, error: GENERIC_RESET_ERROR };
  }

  if (challenge.codeHash !== hashOtpCode(code)) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: GENERIC_RESET_ERROR };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    db.user.update({
      where: { id: user.id },
      // Bumping sessionVersion revokes every session already issued for
      // this user immediately (config.ts's jwt() callback checks it on
      // every request) — same mechanism toggleUserStatus() uses on suspend.
      // Also clears any login lockout, since completing a reset is a
      // stronger identity proof than the password the lockout was guarding.
      data: { password: passwordHash, sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    }),
  ]);

  await logActivity({ userId: user.id, action: "user.password_reset_completed" });

  await sendEmail({
    to: user.email,
    subject: "Your Builders World Forum password was changed",
    text: "Your password was just changed. If this wasn't you, contact Builders World Forum immediately.",
  });

  return { ok: true };
}
