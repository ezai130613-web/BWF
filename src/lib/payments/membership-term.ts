import { pad } from "@/lib/payments/dates";

/**
 * Annual membership terms (2026-11-18, client correction). A member's
 * membership year is NOT the calendar year: it runs from their joining date.
 * Joined 15 Jan 2024 → terms 15 Jan 2024–14 Jan 2025, 15 Jan 2025–14 Jan 2026…
 * the next fee falls due on each anniversary.
 *
 * A term is named by the calendar year it STARTS in — that number is what
 * Payment.membershipYear stores, so payments recorded before this change
 * (e.g. "2026") still line up with the term that starts in that year.
 *
 * Pure and client-safe. Dates are IST calendar days as "YYYY-MM-DD" keys.
 */

export type MembershipTerm = {
  /** Calendar year the term starts in (the Payment.membershipYear value). */
  year: number;
  /** First day of the term. */
  start: string;
  /** Last day of the term (inclusive). */
  end: string;
};

/** The anniversary of a joining day in `year` (29 Feb joiners → 28 Feb in non-leap years). */
function anniversary(joinedKey: string, year: number): string {
  const [, m, d] = joinedKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${year}-${pad(m)}-${pad(Math.min(d, last))}`;
}

export function termFor(joinedKey: string, year: number): MembershipTerm {
  const start = anniversary(joinedKey, year);
  const nextStart = anniversary(joinedKey, year + 1);
  return { year, start, end: addDays(nextStart, -1) };
}

/** The day the fee for a term falls due: `daysBefore` days before the term starts. */
export function dueFrom(term: MembershipTerm, daysBefore: number): string {
  return addDays(term.start, -Math.max(0, daysBefore));
}

export function addDaysKey(key: string, days: number): string {
  return addDays(key, days);
}

function addDays(key: string, days: number): string {
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** The term (by start year) that contains `dateKey`. Dates before joining count as the first term. */
export function termYearAt(joinedKey: string, dateKey: string): number {
  const joinedYear = Number(joinedKey.slice(0, 4));
  const year = Number(dateKey.slice(0, 4));
  const y = dateKey >= anniversary(joinedKey, year) ? year : year - 1;
  return Math.max(y, joinedYear);
}

/** Every term that overlaps [fromKey, toKey], first term onward. */
export function termsOverlapping(joinedKey: string, fromKey: string, toKey: string): MembershipTerm[] {
  if (toKey < joinedKey) return [];
  const out: MembershipTerm[] = [];
  for (let y = termYearAt(joinedKey, fromKey); y <= Number(toKey.slice(0, 4)); y++) {
    const t = termFor(joinedKey, y);
    if (t.start <= toKey && t.end >= fromKey) out.push(t);
  }
  return out;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function short(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]} ${y}`;
}

/** "15 Jan 2025 – 14 Jan 2026" */
export function formatTerm(term: MembershipTerm): string {
  return `${short(term.start)} – ${short(term.end)}`;
}
