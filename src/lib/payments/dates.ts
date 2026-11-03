import { istParts } from "@/lib/ist";
import type { MonthYear } from "@/lib/attendance/manage";

/**
 * Pure (client-safe) helpers for meeting-date payments (2026-11-03) — see
 * src/lib/payments/coverage.ts for the model. Dates are IST calendar days as
 * "YYYY-MM-DD" keys; Payment.meetingDates stores them as UTC midnight.
 */

export const pad = (n: number) => String(n).padStart(2, "0");

/** IST calendar day of an instant, as "YYYY-MM-DD". */
export function istDateKey(date: Date): string {
  const { year, month, day } = istParts(date);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** A @db.Date value (UTC midnight) → "YYYY-MM-DD". */
export function dbDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → the Date Prisma stores in a @db.Date column. */
export function keyToDbDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(keyToDbDate(value).getTime());
}

/** "YYYY-MM-DD" one day earlier — the "pay by" date for a meeting on that day. */
export function dayBefore(key: string): string {
  return dbDateKey(new Date(keyToDbDate(key).getTime() - 86_400_000));
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Thu, 12 Nov 2026" */
export function formatDateKey(key: string): string {
  const d = keyToDbDate(key);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "12 Nov, 26 Nov 2026, 10 Dec 2026" — compact list for tables. */
export function formatMeetingDates(dates: Date[] | string[]): string {
  const keys = dates.map((d) => (typeof d === "string" ? d : dbDateKey(d))).sort();
  return keys
    .map((k) => {
      const d = keyToDbDate(k);
      return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    })
    .join(", ");
}

/** The distinct calendar months a set of meeting dates falls in — kept in Payment.monthsCovered for the month-based screens. */
export function monthsOfDates(keys: string[]): MonthYear[] {
  const seen = new Map<string, MonthYear>();
  for (const k of keys) {
    const [year, month] = k.split("-").map(Number);
    seen.set(`${year}-${month}`, { year, month });
  }
  return [...seen.values()].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Meetings in a month per the chapter's schedule (2 for every chapter today; 2 if unset). */
export function meetingsPerMonth(chapter: { meetingWeeksOfMonth: number[] }): number {
  return chapter.meetingWeeksOfMonth.length || 2;
}

/** Add whole months to a "YYYY-MM-DD" key (day clamped to the month's end). */
export function addMonthsKey(key: string, months: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(d, last))}`;
}


export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PROOF_UPLOAD: "Screenshot upload",
  RAZORPAY: "Razorpay (online)",
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
};

/** What a payment covers, for tables: the membership year, the meeting dates, or (older payments) the months. */
export function paymentCoverageLabel(
  p: { type: string; membershipYear: number | null; meetingDates: Date[]; monthsCovered: unknown },
  formatMonths: (value: never) => string,
): string {
  if (p.type === "MEMBERSHIP") return `Membership year ${p.membershipYear ?? ""}`.trim();
  if (p.meetingDates.length) return `${p.meetingDates.length} meeting${p.meetingDates.length === 1 ? "" : "s"}: ${formatMeetingDates(p.meetingDates)}`;
  return formatMonths(p.monthsCovered as never);
}
