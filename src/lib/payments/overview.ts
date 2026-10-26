import { istParts } from "@/lib/ist";
import { parseMonthsCovered, type MonthYear } from "@/lib/attendance/manage";
import type { Prisma } from "@/generated/prisma/client";

/**
 * A member's payment standing (2026-10-21), shared by /member/payments and
 * the mobile API: this month's meeting fee, how far approved months run
 * continuously from now, the first month a new payment should start from,
 * and this year's membership.
 */

function nextMonth({ month, year }: MonthYear): MonthYear {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

type Standing = "APPROVED" | "PENDING" | null;

type PaymentForSummary = {
  type: "MEETING" | "MEMBERSHIP";
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED";
  monthsCovered: Prisma.JsonValue;
  membershipYear: number | null;
};

export function summarizeMemberPayments(payments: PaymentForSummary[], now = new Date()) {
  // Meeting-fee coverage by month (approved beats pending; rejected never counts).
  const approved = new Set<string>();
  const pending = new Set<string>();
  for (const p of payments) {
    if (p.type !== "MEETING") continue;
    for (const m of parseMonthsCovered(p.monthsCovered)) {
      const key = `${m.year}-${m.month}`;
      if (p.status === "APPROVED") approved.add(key);
      else if (p.status === "PENDING_APPROVAL" || p.status === "CLARIFICATION_REQUESTED") pending.add(key);
    }
  }
  const keyOf = (m: MonthYear) => `${m.year}-${m.month}`;
  const today = istParts(now);
  const thisMonth: MonthYear = { month: today.month + 1, year: today.year };

  const thisMonthStatus: Standing = approved.has(keyOf(thisMonth)) ? "APPROVED" : pending.has(keyOf(thisMonth)) ? "PENDING" : null;
  let paidThrough: MonthYear | null = null;
  for (let m = thisMonth; approved.has(keyOf(m)); m = nextMonth(m)) paidThrough = m;
  // Pre-fill the form from the first month not already paid or awaiting approval.
  let startMonth = thisMonth;
  for (let i = 0; i < 36 && (approved.has(keyOf(startMonth)) || pending.has(keyOf(startMonth))); i++) startMonth = nextMonth(startMonth);

  const membershipFor = (year: number): Standing =>
    payments.some((p) => p.type === "MEMBERSHIP" && p.membershipYear === year && p.status === "APPROVED")
      ? "APPROVED"
      : payments.some((p) => p.type === "MEMBERSHIP" && p.membershipYear === year && (p.status === "PENDING_APPROVAL" || p.status === "CLARIFICATION_REQUESTED"))
        ? "PENDING"
        : null;
  const membershipThisYear = membershipFor(today.year);
  const membershipYears = [today.year - 1, today.year, today.year + 1];
  const defaultMembershipYear = membershipThisYear === null ? today.year : today.year + 1;


  return { today, thisMonth, thisMonthStatus, paidThrough, startMonth, membershipThisYear, membershipYears, defaultMembershipYear };
}

export type MonthTileStatus = "PAID" | "PENDING" | "DUE" | "NO_RECORD" | "UPCOMING";
export type MonthTile = { month: number; year: number; label: string; status: MonthTileStatus; current: boolean };

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Phase 40 — the member's month-by-month meeting-fee dashboard: every month
 * of the current year (from the month they joined, if that's later), plus
 * any later months already paid for or awaiting approval. PAID = covered by
 * an APPROVED payment (the tick); PENDING = submitted, awaiting BWF;
 * DUE = the current month with nothing submitted; NO_RECORD = an earlier
 * month with nothing on record (older payments were made outside this
 * system and never imported — same "don't infer nonpayment" rule as the
 * admin member-wise grid); UPCOMING = future. A rejected payment never counts.
 */
export function buildMonthGrid(payments: PaymentForSummary[], joinedAt: Date, now = new Date()): MonthTile[] {
  const approved = new Set<string>();
  const pending = new Set<string>();
  let lastCovered = 0;
  for (const p of payments) {
    if (p.type !== "MEETING") continue;
    for (const m of parseMonthsCovered(p.monthsCovered)) {
      const key = `${m.year}-${m.month}`;
      if (p.status === "APPROVED") approved.add(key);
      else if (p.status === "PENDING_APPROVAL" || p.status === "CLARIFICATION_REQUESTED") pending.add(key);
      else continue;
      lastCovered = Math.max(lastCovered, m.year * 12 + m.month - 1);
    }
  }
  const today = istParts(now);
  const joined = istParts(joinedAt);
  const currentIndex = today.year * 12 + today.month;
  const startIndex = Math.max(today.year * 12, joined.year * 12 + joined.month);
  const endIndex = Math.max(today.year * 12 + 11, lastCovered);

  const tiles: MonthTile[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const month = (i % 12) + 1;
    const year = Math.floor(i / 12);
    const key = `${year}-${month}`;
    const status: MonthTileStatus = approved.has(key)
      ? "PAID"
      : pending.has(key)
        ? "PENDING"
        : i === currentIndex
          ? "DUE"
          : i < currentIndex
            ? "NO_RECORD"
            : "UPCOMING";
    tiles.push({ month, year, label: `${SHORT_MONTHS[month - 1]} ${year}`, status, current: i === currentIndex });
  }
  return tiles;
}
