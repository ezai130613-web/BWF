"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, newPasswordSchema } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { requirePermission, requireRecentAuth, requireRole } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const ADMIN_ASSIGNABLE_ROLES = [
  "SUPER_ADMIN",
  "CENTRAL_ADMIN",
  "CHAPTER_ADMIN",
  "ACCOUNTS",
  "WEBSITE_ADMIN",
  "MEMBERSHIP_ADMIN",
  "MARKETING_ADMIN",
] as const;

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

const changeRoleSchema = z
  .object({
    userId: z.string(),
    roleKey: z.enum(ADMIN_ASSIGNABLE_ROLES),
    chapterId: z.string().optional(),
  })
  .refine((data) => data.roleKey !== "CHAPTER_ADMIN" || !!data.chapterId, {
    message: "Select a chapter for a Chapter Admin.",
    path: ["chapterId"],
  });

export async function changeUserRole(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session); // changing what a user can access is high-risk (brief §56)

  const parsed = changeRoleSchema.safeParse({
    userId: formData.get("userId"),
    roleKey: formData.get("roleKey"),
    chapterId: formData.get("chapterId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { userId, roleKey, chapterId } = parsed.data;

  if (userId === session.user.id) {
    return { error: "You can't change your own role." };
  }

  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  const wasSuperAdmin = target.roles.some((r) => r.role.key === "SUPER_ADMIN");
  if (wasSuperAdmin && roleKey !== "SUPER_ADMIN") {
    const otherSuperAdmins = await db.userRole.count({
      where: { role: { key: "SUPER_ADMIN" }, userId: { not: userId } },
    });
    if (otherSuperAdmins === 0) {
      return { error: "Can't remove the last Super Admin — promote someone else first." };
    }
  }

  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });

  await db.userRole.deleteMany({ where: { userId, role: { key: { in: [...ADMIN_ASSIGNABLE_ROLES] } } } });
  await db.userRole.create({
    data: { userId, roleId: role.id, chapterId: roleKey === "CHAPTER_ADMIN" ? chapterId : undefined },
  });

  await logActivity({
    userId: session.user.id,
    action: "user.role_changed",
    entity: "User",
    entityId: userId,
    metadata: { roleKey, chapterId },
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

/**
 * Per-person access (2026-11-03): Super Admin sets exactly which
 * permissions one admin holds, independent of their role. Super-Admin-only
 * (not users:manage — Website Admin holds that, and must not be able to raise
 * anyone's access). Super Admin targets are refused: their access is always
 * complete, so nobody can lock them out.
 */
async function loadAccessTarget(userId: string) {
  const session = await requireRole(["SUPER_ADMIN"]);
  requireRecentAuth(session); // changing what a user can access is high-risk (brief §56)
  if (userId === session.user.id) throw new Error("You can't change your own access.");
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (target.roles.some((r) => r.role.key === "SUPER_ADMIN")) throw new Error("Super Admins always have full access.");
  if (!target.roles.some((r) => (ADMIN_ASSIGNABLE_ROLES as readonly string[]).includes(r.role.key))) {
    throw new Error("Not an admin account.");
  }
  return { session, target };
}

export async function setUserAccess(userId: string, formData: FormData) {
  const { session } = await loadAccessTarget(userId);
  const requested = formData.getAll("permission").map(String);
  const permissions = await db.permission.findMany({ where: { key: { in: requested } } });

  await db.$transaction([
    db.userPermission.deleteMany({ where: { userId } }),
    db.userPermission.createMany({ data: permissions.map((p) => ({ userId, permissionId: p.id })) }),
    db.user.update({ where: { id: userId }, data: { customAccess: true } }),
  ]);

  await logActivity({
    userId: session.user.id,
    action: "user.access_changed",
    entity: "User",
    entityId: userId,
    metadata: { permissions: permissions.map((p) => p.key) },
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users/${userId}/access?saved=1`);
}

export async function resetUserAccess(userId: string) {
  const { session } = await loadAccessTarget(userId);

  await db.$transaction([
    db.userPermission.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { customAccess: false } }),
  ]);

  await logActivity({
    userId: session.user.id,
    action: "user.access_reset",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  redirect(`/admin/users/${userId}/access?saved=1`);
}
