"use server";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { requireAdminSession } from "@/lib/auth/rbac";

/**
 * Step-up re-auth (brief §56) — verifies the signed-in admin's current
 * password before a high-risk action (role/permission changes, user
 * suspension). On success, the caller must still call the NextAuth client
 * `update({ refreshAuthTime: true })` hook itself — this action only proves
 * the password is correct, it doesn't hold a session to refresh.
 */
export async function confirmRecentAuth(password: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminSession();

  if (!password) return { ok: false, error: "Enter your password." };

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await verifyPassword(user.password, password);
  if (!valid) return { ok: false, error: "Incorrect password." };

  return { ok: true };
}
