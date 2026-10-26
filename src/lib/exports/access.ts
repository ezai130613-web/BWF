import { getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { CHAPTER_SCOPED_PERMISSIONS } from "@/components/admin/nav-config";

/**
 * Phase 36 — non-throwing versions of rbac.ts's scope helpers, so one
 * request can ask "what may this admin download?" for every dataset at once
 * (the "Download all data" workbook) without the first denied dataset
 * aborting the whole response. Same rules as the pages:
 *
 *  - chapterScope ↔ getChapterScope(): blanket permission → "ALL"; a Chapter
 *    Admin → their own chapter (only for the chapter-scoped areas their
 *    sidebar shows them).
 *  - paymentsScope ↔ getPaymentsScope().
 *  - blanket ↔ requirePermission().
 *
 * `null` means no access.
 */

export type ExportScope = "ALL" | string;

export type ExportAccess = {
  userId: string;
  roles: string[];
  chapterId: string | null;
  permissions: Set<string>;
};

export async function getExportAccess(): Promise<ExportAccess> {
  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  return {
    userId: session.user.id,
    roles: session.user.roles,
    chapterId: session.user.chapterId ?? null,
    permissions,
  };
}

export function blanket(access: ExportAccess, permission: string): ExportScope | null {
  return access.permissions.has(permission) ? "ALL" : null;
}

export function chapterScope(access: ExportAccess, permission: string): ExportScope | null {
  if (access.permissions.has(permission)) return "ALL";
  if (access.roles.includes("CHAPTER_ADMIN") && access.chapterId && CHAPTER_SCOPED_PERMISSIONS.includes(permission)) {
    return access.chapterId;
  }
  return null;
}

export function paymentsScope(access: ExportAccess): ExportScope | null {
  if (!access.permissions.has("payments:view")) return null;
  if (access.roles.some((r) => ["SUPER_ADMIN", "CENTRAL_ADMIN", "ACCOUNTS"].includes(r))) return "ALL";
  if (access.roles.includes("CHAPTER_ADMIN") && access.chapterId) return access.chapterId;
  return null;
}

/** A requested chapter filter, narrowed by scope: a Chapter Admin's own chapter always wins over the query string. */
export function effectiveChapterId(scope: ExportScope, requested: string | null | undefined): string | undefined {
  return scope === "ALL" ? requested || undefined : scope;
}

/** `YYYY-MM-DD` → the start of that IST day; anything else → undefined. */
export function istDayStart(value: string | null | undefined): Date | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : undefined;
}

/** `YYYY-MM-DD` → the end of that IST day (inclusive "to" filters). */
export function istDayEnd(value: string | null | undefined): Date | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999+05:30`) : undefined;
}
