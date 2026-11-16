import { db } from "@/lib/db";
import type { Prisma, PendingItemStatus } from "@/generated/prisma/client";

/** 2026-11-17 — the admin "Pending Points" tracker: filters shared by the page, the Excel and the PDF. */
export const PENDING_STATUS_LABELS: Record<PendingItemStatus, string> = { OPEN: "Open", IN_PROGRESS: "In progress", DONE: "Done" };

export type PendingFilters = { chapterId?: string; assignedToUserId?: string; from?: string; to?: string; status?: PendingItemStatus | "ACTIVE" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePendingFilters(p: { chapterId?: string | null; assignedTo?: string | null; from?: string | null; to?: string | null; status?: string | null }): PendingFilters {
  const status = p.status === "ACTIVE" || (p.status && p.status in PENDING_STATUS_LABELS) ? (p.status as PendingFilters["status"]) : undefined;
  return {
    chapterId: p.chapterId || undefined,
    assignedToUserId: p.assignedTo || undefined,
    from: p.from && DATE_RE.test(p.from) ? p.from : undefined,
    to: p.to && DATE_RE.test(p.to) ? p.to : undefined,
    status,
  };
}

export async function getPendingItems(filters: PendingFilters, scopeChapterId?: string) {
  const chapterId = scopeChapterId ?? filters.chapterId;
  const raised: Prisma.DateTimeFilter = {};
  if (filters.from) raised.gte = new Date(`${filters.from}T00:00:00+05:30`);
  if (filters.to) raised.lte = new Date(`${filters.to}T23:59:59.999+05:30`);
  return db.pendingItem.findMany({
    where: {
      ...(chapterId ? { chapterId } : {}),
      ...(filters.assignedToUserId === "NONE" ? { assignedToUserId: null } : filters.assignedToUserId ? { assignedToUserId: filters.assignedToUserId } : {}),
      ...(filters.from || filters.to ? { raisedOn: raised } : {}),
      ...(filters.status === "ACTIVE" ? { status: { not: "DONE" } } : filters.status ? { status: filters.status } : {}),
    },
    include: { chapter: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: [{ raisedOn: "desc" }, { createdAt: "desc" }],
  });
}

/** Admin accounts a point can be assigned to. */
export async function getAssignableAdmins() {
  const { ADMIN_ROLE_KEYS } = await import("@/lib/auth/constants");
  return db.user.findMany({
    where: { status: "ACTIVE", roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
