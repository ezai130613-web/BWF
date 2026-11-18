import { db } from "@/lib/db";
import { istParts } from "@/lib/ist";
import { formatMonthYear, parseMonthsCovered } from "@/lib/attendance/manage";
import { istDateKey } from "@/lib/payments/dates";
import { getNumberSetting } from "@/lib/settings";
import { addDaysKey, dueFrom, formatTerm, termFor, termsOverlapping, termYearAt } from "@/lib/payments/membership-term";

/**
 * 2026-11-17 client request — "summary of members who have not paid", chapter
 * wise and month wise, for a from/to date range. One row per member per
 * unpaid period: each calendar month in the range (meeting fee) and each
 * annual-membership term in the range.
 *
 * Annual membership runs from the member's joining date (2026-11-18): a term
 * is joinedAt → the day before the next anniversary, and the next fee falls
 * due when it ends. A term counts as paid with an APPROVED payment for it or
 * when an admin marked it paid (Member.membershipPaidTerms — payments before
 * the system existed). See src/lib/payments/membership-term.ts.
 *
 * A period counts as unpaid only when the member has no APPROVED payment
 * covering it. A submitted-but-unreviewed payment is reported as "Pending
 * approval" (money is in, awaiting Accounts), never as unpaid. Months before
 * the member existed in the system, and months that haven't started yet, are
 * skipped — we don't know what was paid outside the system earlier.
 */

/** `month` (YYYY-MM) is the month-wise filter: when set it replaces from/to with that whole month. */
export type UnpaidFee = "all" | "annual" | "meeting";
export type UnpaidFilters = { chapterId?: string; month?: string; from: string; to: string; includePending: boolean; fee: UnpaidFee };
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

export function parseUnpaidFilters(params: { chapterId?: string | null; month?: string | null; from?: string | null; to?: string | null; pending?: string | null; fee?: string | null }): UnpaidFilters {
  const today = todayKey();
  const fee: UnpaidFee = params.fee === "annual" || params.fee === "meeting" ? params.fee : "all";
  if (params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)) {
    const [y, m] = params.month.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { chapterId: params.chapterId || undefined, month: params.month, from: `${params.month}-01`, to: `${params.month}-${String(last).padStart(2, "0")}`, includePending: params.pending === "1", fee };
  }
  const to = params.to && DATE_RE.test(params.to) ? params.to : today;
  const from = params.from && DATE_RE.test(params.from) ? params.from : `${to.slice(0, 7)}-01`;
  return {
    chapterId: params.chapterId || undefined,
    from: from <= to ? from : to,
    to,
    includePending: params.pending === "1",
    fee,
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
  const todayKey = istDateKey(new Date());
  const termTo = filters.to < todayKey ? filters.to : todayKey;
  // The fee is due `dueDays` before a year starts, so a year that starts soon already counts.
  const dueDays = await getNumberSetting("membership.dueDaysBefore");
  if (months.length === 0) return [];

  const members = await db.member.findMany({
    where: { status: "ACTIVE", rosterEligible: true, ...(chapterId ? { chapterId } : {}) },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      joinedAt: true,
      membershipPaidTerms: true,
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
    const paidTerms = new Set(member.membershipPaidTerms);
    const base = { memberId: member.id, member: member.name, phone: member.phone ?? "", chapter: member.chapter.name, category: member.category.name };

    for (const m of filters.fee === "annual" ? [] : months) {
      if (monthIndex(m.year, m.month) < monthIndex(joined.year, joined.month + 1)) continue;
      const key = `M${m.year}-${m.month}`;
      if (approved.has(key)) continue;
      if (pending.has(key)) {
        if (filters.includePending) rows.push({ ...base, kind: "Meeting fee", period: formatMonthYear(m), status: "Pending approval" });
      } else rows.push({ ...base, kind: "Meeting fee", period: formatMonthYear(m), status: "Not paid" });
    }
    // A year is due from `dueDays` before it starts.
    for (const t of filters.fee === "meeting" ? [] : termsOverlapping(istDateKey(member.joinedAt), filters.from, addDaysKey(termTo, dueDays))) {
      if (dueFrom(t, dueDays) > todayKey || dueFrom(t, dueDays) > termTo) continue;
      const key = `Y${t.year}`;
      if (approved.has(key) || paidTerms.has(t.year)) continue;
      const period = formatTerm(t);
      if (pending.has(key)) {
        if (filters.includePending) rows.push({ ...base, kind: "Annual membership", period, status: "Pending approval" });
      } else rows.push({ ...base, kind: "Annual membership", period, status: "Not paid" });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// One member's summary — what the Unpaid Members list opens when a name is clicked.
// ---------------------------------------------------------------------------

export type MemberTermRow = { year: number; label: string; status: "Paid" | "Marked paid" | "Awaiting approval" | "Not paid" | "Not started" };
export type MemberMonthRow = { label: string; status: "Paid" | "Awaiting approval" | "Not paid" };

export async function getMemberUnpaidSummary(memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      createdAt: true,
      joinedAt: true,
      membershipPaidTerms: true,
      chapter: { select: { name: true } },
      category: { select: { name: true } },
      company: { select: { name: true } },
      payments: {
        orderBy: { actualPaymentDate: "desc" },
        select: { id: true, type: true, status: true, method: true, amountPaidInr: true, actualPaymentDate: true, monthsCovered: true, membershipYear: true },
      },
    },
  });
  if (!member) return null;

  const todayK = istDateKey(new Date());
  const joinedKey = istDateKey(member.joinedAt);
  const approved = new Set<string>();
  const pending = new Set<string>();
  for (const p of member.payments) {
    if (p.status !== "APPROVED" && p.status !== "PENDING_APPROVAL" && p.status !== "CLARIFICATION_REQUESTED") continue;
    const target = p.status === "APPROVED" ? approved : pending;
    if (p.type === "MEETING") for (const m of parseMonthsCovered(p.monthsCovered)) target.add(`M${m.year}-${m.month}`);
    else if (p.membershipYear) target.add(`Y${p.membershipYear}`);
  }

  // Annual membership: every term since joining, newest first.
  const firstYear = Number(joinedKey.slice(0, 4));
  const dueDays = await getNumberSetting("membership.dueDaysBefore");
  // Include next year's term once its fee is due (it falls due `dueDays` before it starts).
  const currentTerm = termYearAt(joinedKey, addDaysKey(todayK, dueDays));
  const terms: MemberTermRow[] = [];
  for (let y = currentTerm; y >= firstYear; y--) {
    const t = termFor(joinedKey, y);
    const key = `Y${y}`;
    const status: MemberTermRow["status"] = approved.has(key)
      ? "Paid"
      : member.membershipPaidTerms.includes(y)
        ? "Marked paid"
        : pending.has(key)
          ? "Awaiting approval"
          : dueFrom(t, dueDays) > todayK
            ? "Not started"
            : "Not paid";
    terms.push({ year: y, label: formatTerm(t), status });
  }

  // Meeting fee: the last 12 months (not before the member was added to the system).
  const now = istParts(new Date());
  const added = istParts(member.createdAt);
  const months: MemberMonthRow[] = [];
  for (let i = 0; i < 12; i++) {
    const idx = now.year * 12 + now.month - i;
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    if (y * 12 + m - 1 < added.year * 12 + added.month) break;
    const key = `M${y}-${m}`;
    months.push({ label: formatMonthYear({ year: y, month: m }), status: approved.has(key) ? "Paid" : pending.has(key) ? "Awaiting approval" : "Not paid" });
  }

  return { member, joinedKey, terms, months };
}
