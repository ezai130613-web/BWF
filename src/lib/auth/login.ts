import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { logActivity } from "@/lib/audit";
import { CredentialsSignin } from "next-auth";

/**
 * Single-step (email + password) login logic shared by the admin and member
 * NextAuth Credentials providers — Sept 2026 client correction removed the
 * OTP/second-factor step that used to sit in front of this (see the removed
 * `otp-login.ts`); lockout and non-enumeration behavior are unchanged.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Deliberately generic — never reveal whether the email exists, whether the
// password was wrong, or whether the account is locked/wrong-role.
export const GENERIC_LOGIN_ERROR = "Invalid email or password.";

export class AccountLockedError extends CredentialsSignin {
  code = "account-locked";
}

export type LoginResult = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  chapterId: string | null;
  sessionVersion: number;
} | null;

export async function authorizeLogin(
  email: unknown,
  password: unknown,
  allowedRoleKeys: string[],
): Promise<LoginResult> {
  if (typeof email !== "string" || typeof password !== "string") return null;

  const normalizedEmail = email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { roles: { include: { role: true } } },
  });

  if (!user) return null;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AccountLockedError();
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

    return null;
  }

  const chapterAdminAssignment = user.roles.find((r) => r.role.key === "CHAPTER_ADMIN");

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0 },
  });

  await logActivity({ userId: user.id, action: "user.login_success" });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: roleKeys,
    chapterId: chapterAdminAssignment?.chapterId ?? null,
    sessionVersion: user.sessionVersion,
  };
}
