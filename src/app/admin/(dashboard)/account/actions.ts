"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/rbac";
import { hashPassword, newPasswordSchema, verifyPassword } from "@/lib/auth/password";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { logActivity } from "@/lib/audit";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "The two new passwords don't match.", path: ["confirmPassword"] });

/**
 * Any signed-in admin (incl. Super Admin, 2026-10-21 client request) changing
 * their own password. Bumps sessionVersion like a password reset, so every
 * other device is signed out; the client signs straight back in with the new
 * password using the returned identifier.
 */
export async function changeOwnPassword(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<{ error?: string; identifier?: string }> {
  const session = await requireAdminSession();

  if (!(await rateLimit(`change-password:${session.user.id}`, { limit: 10, windowSeconds: 3600 }))) {
    return { error: TOO_MANY_REQUESTS_ERROR };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!(await verifyPassword(user.password, parsed.data.currentPassword))) {
    return { error: "Your current password is incorrect." };
  }
  if (parsed.data.password === parsed.data.currentPassword) {
    return { error: "Choose a new password that's different from your current one." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(parsed.data.password),
      sessionVersion: { increment: 1 },
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await logActivity({ userId: user.id, action: "user.password_changed", entity: "User", entityId: user.id });

  return { identifier: user.email ?? user.username ?? undefined };
}
