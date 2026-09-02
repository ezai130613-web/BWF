import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do this.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Cached per-request so repeated checks in one render don't repeat the query. */
export const getUserPermissionKeys = cache(async (userId: string) => {
  const rows = await db.rolePermission.findMany({
    where: { role: { users: { some: { userId } } } },
    select: { permission: { select: { key: true } } },
  });
  return new Set(rows.map((r) => r.permission.key));
});

/** Use in a Server Component/layout to gate an entire admin page on being signed in. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session as Session & { user: NonNullable<Session["user"]> };
}

export async function requirePermission(permissionKey: string) {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  if (!permissions.has(permissionKey)) {
    throw new ForbiddenError(`Missing permission: ${permissionKey}`);
  }
  return session;
}

export async function requireRole(roleKeys: string[]) {
  const session = await requireAdminSession();
  if (!session.user.roles.some((role) => roleKeys.includes(role))) {
    throw new ForbiddenError();
  }
  return session;
}

/**
 * Brief §56 — "recent-authentication requirement for high-risk actions"
 * (permanent delete, role changes, etc.). Call after requireAdminSession()
 * for those specific actions.
 */
export function requireRecentAuth(session: Session, maxAgeMinutes = 15) {
  const authTime = session.user?.authTime ?? 0;
  if (Date.now() - authTime > maxAgeMinutes * 60 * 1000) {
    throw new ForbiddenError("Please sign in again to confirm this action.");
  }
}

/**
 * Chapter-scoped access (brief §11: "Chapter Admin can only access their
 * assigned chapter"). Unlike requirePermission(), this does NOT go through
 * RolePermission — Chapter Admin intentionally holds no global permissions
 * (see prisma/seed.ts) because their access is scoped by chapter, not by a
 * blanket grant. Returns "ALL" for Super/Central Admin (who bypass scoping
 * entirely via their global manage permission) or the specific chapterId a
 * Chapter Admin is confirmed to have access to; throws otherwise.
 */
export async function requireChapterAccess(
  chapterId: string,
  globalPermissionKey: string,
): Promise<"ALL" | string> {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);

  if (permissions.has(globalPermissionKey)) return "ALL";

  if (session.user.roles.includes("CHAPTER_ADMIN") && session.user.chapterId === chapterId) {
    return chapterId;
  }

  throw new ForbiddenError("You do not have access to this chapter.");
}

/** Chapter id a Chapter Admin is scoped to, or "ALL" for Super/Central Admin — for filtering a list view rather than a single-record check. */
export async function getChapterScope(globalPermissionKey: string): Promise<"ALL" | string> {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);

  if (permissions.has(globalPermissionKey)) return "ALL";
  if (session.user.roles.includes("CHAPTER_ADMIN") && session.user.chapterId) {
    return session.user.chapterId;
  }

  throw new ForbiddenError();
}
