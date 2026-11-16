import { db } from "@/lib/db";
import { istParts } from "@/lib/ist";
import { formatMonthYear, parseMonthsCovered } from "@/lib/attendance/manage";

/**
 * 2026-11-17 client request — "summary of members who have not paid", chapter
 * wise and month wise, for a from/to date range. One row per member per
 * unpaid period: each calendar month in the range (meeting fee) and each
 * year in the range (annual membership).
 *
 * A period counts as unpaid only when the member has no APPROVED payment
 * covering it. A submitted-but-unreviewed payment is reported as "Pending
 * approval" (money is in, awaiting Accounts), never as unpaid. Months before
 * the member existed in the system, and months that haven't started yet, are
 * skipped — we don't know what was paid outside the system earlier.
 */

/** `month` (YYYY-MM) is the month-wise filter: when set it replaces from/to with that whole month. */
export type UnpaidFilters = { chapterId?: string; month?: string; from: string; to: string; includePending: boolean };
export type UnpaidRow = {
  memberId: string;
  member: string;
  phone: string;
  chapter: string;
  category: string;
  kind: "Meeting fee" | "Annual membership";
  period: string;
  status: "Not paid" | "Pending approval";
};

const MAX_MONTHS = 24;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function parseUnpaidFilters(params: { chapterId?: string | null; month?: string | null; from?: string | null; to?: string | null; pending?: string | null }): UnpaidFilters {
  const today = todayKey();
  if (params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { chapterId: params.chapterId || undefined, month: params.month, from: `${params.month}-01`, to: `${params.month}-${String(last).padStart(2, "0")}`, includePending: params.pending === "1" };
  }
  const to = params.to && DATE_RE.test(params.to) ? params.to : today;
  const from = params.from && DATE_RE.test(params.from) ? params.from : `${to.slice(0, 7)}-01`;
  return {
    chapterId: params.chapterId || undefined,
    from: from <= to ? from : to,
    to,
    includePending: params.pending === "1",
  };
}

function monthsBetween(from: string, to: string): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  while ((y < endY || (y === endY && m <= endM)) && out.length < MAX_MONTHS) {
    out.push({ year: y, month: m });
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export async function getUnpaidRows(filters: UnpaidFilters, scopeChapterId?: string): Promise<UnpaidRow[]> {
  const chapterId = scopeChapterId ?? filters.chapterId;
  const now = istParts(new Date());
  const monthIndex = (y: number, m: number) => y * 12 + m;
  const currentIndex = monthIndex(now.year, now.month + 1);
  const months = monthsBetween(filters.from, filters.to).filter((m) => monthIndex(m.year, m.month) <= currentIndex);
  const years = [...new Set(months.map((m) => m.year))].filter((y) => y <= now.year);
  if (months.length === 0) return [];

  const members = await db.member.findMany({
    where: { status: "ACTIVE", rosterEligible: true, ...(chapterId ? { chapterId } : {}) },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      chapter: { select: { name: true } },
      category: { select: { name: true } },
      payments: {
        where: { status: { in: ["APPROVED", "PENDING_APPROVAL", "CLARIFICATION_REQUESTED"] } },
        select: { type: true, status: true, monthsCovered: true, membershipYear: true },
      },
    },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

  const rows: UnpaidRow[] = [];
  for (const member of members) {
    const approved = new Set<string>();
    const pending = new Set<string>();
    for (const p of member.payments) {
      const target = p.status === "APPROVED" ? approved : pending;
      if (p.type === "MEETING") for (const m of parseMonthsCovered(p.monthsCovered)) target.add(`M${m.year}-${m.month}`);
      else if (p.membershipYear) target.add(`Y${p.membershipYear}`);
    }
    const joined = istParts(member.createdAt);
    const base = { memberId: member.id, member: member.name, phone: member.phone ?? "", chapter: member.chapter.name, category: member.category.name };

    for (const m of months) {
      if (monthIndex(m.year, m.month) < monthIndex(joined.year, joined.month + 1)) continue;
      const key = `M${m.year}-${m.month}`;
      if (approved.has(key)) continue;
      if (pending.has(key)) {
        if (filters.includePending) rows.push({ ...base, kind: "Meeting fee", period: formatMonthYear(m), status: "Pending approval" });
      } else rows.push({ ...base, kind: "Meeting fee", period: formatMonthYear(m), status: "Not paid" });
    }
    for (const y of years) {
      if (y < joined.year) continue;
      const key = `Y${y}`;
      if (approved.has(key)) continue;
      if (pending.has(key)) {
        if (filters.includePending) rows.push({ ...base, kind: "Annual membership", period: String(y), status: "Pending approval" });
      } else rows.push({ ...base, kind: "Annual membership", period: String(y), status: "Not paid" });
    }
  }
  return rows;
}
