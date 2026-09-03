import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";
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

/**
 * Use in a Server Component/layout to gate an entire admin page on being
 * signed in AND holding an admin role. The role check matters as of Phase
 * 11: the same NextAuth session/JWT mechanism is now also used for member
 * logins, so "some session exists" alone is no longer sufficient — without
 * this, a signed-in Member could load any /admin page (blocked later by
 * requirePermission()/requireChapterAccess() for anything permission-gated,
 * but the plain dashboard has no such check and would otherwise render).
 */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || !session.user.roles.some((role) => ADMIN_ROLE_KEYS.includes(role))) {
    redirect("/admin/login");
  }
  return session as Session & { user: NonNullable<Session["user"]> };
}

/**
 * Member-portal equivalent of requireAdminSession() (Phase 11, brief §12).
 * Requires the MEMBER role specifically — an admin who happens to be signed
 * in elsewhere doesn't get member-portal access just by being authenticated,
 * same as a Member holds no admin permissions.
 */
export async function requireMemberSession() {
  const session = await auth();
  if (!session?.user || !session.user.roles.includes("MEMBER")) redirect("/member/login");
  return session as Session & { user: NonNullable<Session["user"]> };
}

/** requireMemberSession() plus the Member row their login is linked to — the shape every /member/(portal) page actually needs. */
export async function requireMemberProfile() {
  const session = await requireMemberSession();
  const member = await db.member.findUnique({ where: { userId: session.user.id } });
  // Login exists but its Member link was removed (e.g. admin revoked
  // access) — treat as signed out rather than crashing on a null profile.
  if (!member) redirect("/member/login");
  return { session, member };
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
