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
