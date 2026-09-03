import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { generateOtpCode, hashOtpCode, otpExpiryDate } from "@/lib/auth/otp";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";

/**
 * Shared two-step (password, then OTP) login logic — brief §6's baseline
 * "Email, Password, OTP/second-factor verification" applies to every login
 * surface, not just admin. Extracted in Phase 11 once a second real caller
 * (member login) needed the exact same lockout/verification behavior:
 * duplicating ~60 lines of security-sensitive logic across two routes would
 * have been a real risk (a lockout or timing fix applied to one copy and
 * not the other), unlike the project's usual "three similar lines is fine"
 * bar for premature abstraction.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Deliberately generic — never reveal whether the email exists, whether the
// password was wrong, or whether the account is locked/wrong-role.
export const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export async function requestOtp(
  email: string,
  password: string,
  allowedRoleKeys: string[],
): Promise<{ challengeId: string } | { error: string; status: number }> {
  const normalizedEmail = email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    return { error: GENERIC_LOGIN_ERROR, status: 401 };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many failed attempts. Try again later.", status: 429 };
  }

  const roleKeys = user.roles.map((r) => r.role.key);
  const hasAllowedRole = roleKeys.some((key) => allowedRoleKeys.includes(key));

  const passwordValid = user.status === "ACTIVE" && hasAllowedRole && (await verifyPassword(user.password, password));

  if (!passwordValid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

    await db.user.update({ where: { id: user.id }, data: { failedLoginCount, lockedUntil } });
    await logActivity({ userId: user.id, action: "user.login_failed" });

    return { error: GENERIC_LOGIN_ERROR, status: 401 };
  }

  const code = generateOtpCode();
  const challenge = await db.otpChallenge.create({
    data: { userId: user.id, codeHash: hashOtpCode(code), expiresAt: otpExpiryDate() },
  });

  await sendEmail({
    to: user.email,
    subject: "Your Builders World Forum login code",
    text: `Your login code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });

  await logActivity({ userId: user.id, action: "user.otp_requested" });

  return { challengeId: challenge.id };
}

export type OtpAuthorizeResult = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  chapterId: string | null;
  sessionVersion: number;
} | null;

export async function authorizeOtpLogin(
  challengeId: unknown,
  code: unknown,
  allowedRoleKeys: string[],
): Promise<OtpAuthorizeResult> {
  if (typeof challengeId !== "string" || typeof code !== "string") return null;

  const challenge = await db.otpChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });

  if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) return null;
  if (challenge.attempts >= challenge.maxAttempts) return null;

  const codeMatches = challenge.codeHash === hashOtpCode(code);

  if (!codeMatches) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    return null;
  }

  const roleKeys = challenge.user.roles.map((r) => r.role.key);
  if (!roleKeys.some((key) => allowedRoleKeys.includes(key))) return null;

  const chapterAdminAssignment = challenge.user.roles.find((r) => r.role.key === "CHAPTER_ADMIN");

  await db.$transaction([
    db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
    db.user.update({ where: { id: challenge.userId }, data: { lastLoginAt: new Date(), failedLoginCount: 0 } }),
  ]);

  await logActivity({ userId: challenge.userId, action: "user.login_success" });

  return {
    id: challenge.user.id,
    email: challenge.user.email,
    name: challenge.user.name,
    roles: roleKeys,
    chapterId: chapterAdminAssignment?.chapterId ?? null,
    sessionVersion: challenge.user.sessionVersion,
  };
}
