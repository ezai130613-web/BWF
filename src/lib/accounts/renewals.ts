import { db } from "@/lib/db";
import { istDateKey } from "@/lib/payments/dates";
import { getNumberSetting } from "@/lib/settings";
import { addDaysKey, dueFrom, formatTerm, termFor, termYearAt } from "@/lib/payments/membership-term";

/**
 * 2026-11-19 client request — annual-membership renewal follow-up list.
 * One row per ACTIVE member whose annual fee is not yet paid, in two groups:
 *
 *  - Overdue: the fee's due date has passed (same rule as the Unpaid Members
 *    report: due `membership.dueDaysBefore` days before the term starts).
 *    Sorted longest overdue first, measured from the OLDEST unpaid term.
 *  - Due soon: nothing overdue, but the next term's due date falls within the
 *    chosen number of months. Sorted soonest first, so next month's renewals
 *    can be chased now.
 *
 * A term is paid with an APPROVED payment for it or when an admin marked it
 * paid (Member.membershipPaidTerms). A term whose payment is awaiting
 * approval is hidden by default (the money is already in); the "include
 * awaiting approval" toggle lists it with an "Awaiting approval" flag.
 */

export type RenewalShow = "all" | "overdue" | "soon";
export type RenewalFilters = { chapterId?: string; show: RenewalShow; months: number; includePending: boolean };
export type RenewalRow = {
  memberId: string;
  member: string;
  phone: string;
  chapter: string;
  category: string;
  group: "overdue" | "soon";
  /** The term this row is about: oldest unpaid (overdue) or next upcoming (soon). */
  term: string;
  dueDate: string;
  /** Overdue: days past due. Soon: days until due. */
  days: number;
  /** Overdue only: how many unpaid terms the member has in total. */
  unpaidTerms: number;
  /** The listed term has a payment submitted that is awaiting Accounts approval. */
  awaitingApproval: boolean;
};

export const SOON_MONTH_OPTIONS = [1, 2, 3, 6, 12] as const;

export function parseRenewalFilters(params: { chapterId?: string | null; show?: string | null; months?: string | null; pending?: string | null }): RenewalFilters {
  const months = Number(params.months);
  return {
    chapterId: params.chapterId || undefined,
    show: params.show === "overdue" || params.show === "soon" ? params.show : "all",
    includePending: params.pending === "1",
    months: (SOON_MONTH_OPTIONS as readonly number[]).includes(months) ? months : 3,
  };
}

function addMonthsKey(key: string, months: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const idx = y * 12 + (m - 1) + months;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((new Date(`${toKey}T00:00:00Z`).getTime() - new Date(`${fromKey}T00:00:00Z`).getTime()) / 86_400_000);
}

export async function getRenewalRows(filters: RenewalFilters, scopeChapterId?: string): Promise<{ overdue: RenewalRow[]; soon: RenewalRow[] }> {
  const chapterId = scopeChapterId ?? filters.chapterId;
  const today = istDateKey(new Date());
  const dueDays = await getNumberSetting("membership.dueDaysBefore");
  const horizon = addMonthsKey(today, filters.months);

  const members = await db.member.findMany({
    where: { status: "ACTIVE", rosterEligible: true, ...(chapterId ? { chapterId } : {}) },
    select: {
      id: true,
      name: true,
      phone: true,
      joinedAt: true,
      membershipPaidTerms: true,
      chapter: { select: { name: true } },
      category: { select: { name: true } },
      payments: {
        where: { type: "MEMBERSHIP", status: { in: ["APPROVED", "PENDING_APPROVAL", "CLARIFICATION_REQUESTED"] }, membershipYear: { not: null } },
        select: { status: true, membershipYear: true },
      },
    },
  });

  const overdue: RenewalRow[] = [];
  const soon: RenewalRow[] = [];
  for (const member of members) {
    const settled = new Set<number>(member.membershipPaidTerms);
    const awaiting = new Set<number>();
    for (const p of member.payments) {
      if (!p.membershipYear) continue;
      if (p.status === "APPROVED") settled.add(p.membershipYear);
      else awaiting.add(p.membershipYear);
    }
    // Awaiting-approval terms are hidden unless the toggle is on, in which case they're listed with a flag.
    if (!filters.includePending) for (const y of awaiting) settled.add(y);
    const joinedKey = istDateKey(member.joinedAt);
    const firstYear = Number(joinedKey.slice(0, 4));
    const lastYear = termYearAt(joinedKey, addDaysKey(today, dueDays)) + 1;
    const base = { memberId: member.id, member: member.name, phone: member.phone ?? "", chapter: member.chapter.name, category: member.category.name };

    const unpaidDue: { term: ReturnType<typeof termFor>; due: string; pending: boolean }[] = [];
    let upcoming: { term: ReturnType<typeof termFor>; due: string; pending: boolean } | null = null;
    for (let y = firstYear; y <= lastYear; y++) {
      const term = termFor(joinedKey, y);
      const due = dueFrom(term, dueDays);
      if (due <= today) {
        if (!settled.has(y)) unpaidDue.push({ term, due, pending: awaiting.has(y) });
      } else {
        // First term not yet due. If it's already paid in advance the member has nothing to chase.
        if (!settled.has(y)) upcoming = { term, due, pending: awaiting.has(y) };
        break;
      }
    }

    if (unpaidDue.length > 0) {
      const oldest = unpaidDue[0];
      overdue.push({ ...base, group: "overdue", term: formatTerm(oldest.term), dueDate: oldest.due, days: daysBetween(oldest.due, today), unpaidTerms: unpaidDue.length, awaitingApproval: oldest.pending });
    } else if (upcoming && upcoming.due <= horizon) {
      soon.push({ ...base, group: "soon", term: formatTerm(upcoming.term), dueDate: upcoming.due, days: daysBetween(today, upcoming.due), unpaidTerms: 0, awaitingApproval: upcoming.pending });
    }
  }

  overdue.sort((a, b) => b.days - a.days || a.member.localeCompare(b.member));
  soon.sort((a, b) => a.days - b.days || a.member.localeCompare(b.member));
  return {
    overdue: filters.show === "soon" ? [] : overdue,
    soon: filters.show === "overdue" ? [] : soon,
  };
}
