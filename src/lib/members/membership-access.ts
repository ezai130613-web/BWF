import { forbidden } from "next/navigation";
import { getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";

/**
 * Who may set joining dates / paid years (2026-11-18): Super/Central Admin and
 * Accounts (global `members:manage` or `payments:approve`) for every chapter;
 * a Chapter Admin for their own chapter only. Returns "ALL" or the chapter id.
 */
export async function membershipEditScope(): Promise<"ALL" | string> {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  if (permissions.has("members:manage") || permissions.has("payments:approve")) return "ALL";
  if (session.user.roles.includes("CHAPTER_ADMIN") && session.user.chapterId) return session.user.chapterId;
  forbidden();
}
