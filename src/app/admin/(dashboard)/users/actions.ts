"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, newPasswordSchema } from "@/lib/auth/password";
import { requirePermission, requireRecentAuth } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const ADMIN_ASSIGNABLE_ROLES = ["SUPER_ADMIN", "CENTRAL_ADMIN", "CHAPTER_ADMIN"] as const;

const createUserSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email(),
    password: newPasswordSchema,
    roleKey: z.enum(ADMIN_ASSIGNABLE_ROLES),
    chapterId: z.string().optional(),
  })
  .refine((data) => data.roleKey !== "CHAPTER_ADMIN" || !!data.chapterId, {
    message: "Select a chapter for a Chapter Admin.",
    path: ["chapterId"],
  });

export async function createAdminUser(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("users:manage");

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleKey: formData.get("roleKey"),
    chapterId: formData.get("chapterId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, email, password, roleKey, chapterId } = parsed.data;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      roles: {
        create: { roleId: role.id, chapterId: roleKey === "CHAPTER_ADMIN" ? chapterId : undefined },
      },
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "user.created",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, roleKey },
  });

  revalidatePath("/admin/users");
  return { error: undefined };
}

export async function toggleUserStatus(userId: string) {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session); // suspending an admin is a high-risk action (brief §56)

  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const nextStatus = target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  await db.user.update({
    where: { id: userId },
    data: {
      status: nextStatus,
      // Suspending a user should also kill any session already in their
      // browser — bump sessionVersion so the next jwt callback revokes it.
      sessionVersion: { increment: 1 },
    },
  });

  await logActivity({
    userId: session.user.id,
    action: nextStatus === "SUSPENDED" ? "user.suspended" : "user.reactivated",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/admin/users");
}
