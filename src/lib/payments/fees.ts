import { MEMBERSHIP_GST_PERCENT } from "@/lib/format";

/**
 * Phase 40 (2026-10-26) — what a payment should come to. The monthly meeting
 * fee and the annual membership fee are admin-set plain numbers (Website
 * Content → Fees); both carry 18% GST (client, 2026-10-26). The member's
 * form pre-fills these totals but the amount stays editable, so the expected
 * amount is stored on the Payment for admins to compare against.
 * Client-safe (no database imports) — the payment forms use it for the live total.
 */

export const MEETING_FEE_GST_PERCENT = 18;

/** A fee setting as a positive number, or null when unset / not a plain number. */
export function parseFee(value: string | null | undefined): number | null {
  const n = Number(value);
  return value && Number.isFinite(n) && n > 0 ? n : null;
}

export type FeeQuote = { perMonth: number; months: number; subtotal: number; gst: number; total: number; gstPercent: number };

/** months × monthly fee, plus GST, rounded to whole rupees. */
export function quoteMeetingFee(monthlyFee: number | null, months: number): FeeQuote | null {
  if (!monthlyFee || !Number.isInteger(months) || months < 1) return null;
  const subtotal = Math.round(monthlyFee * months);
  const gst = Math.round((subtotal * MEETING_FEE_GST_PERCENT) / 100);
  return { perMonth: monthlyFee, months, subtotal, gst, total: subtotal + gst, gstPercent: MEETING_FEE_GST_PERCENT };
}

/** The annual membership fee plus GST, rounded to whole rupees. */
export function quoteMembershipFee(annualFee: number | null): number | null {
  return annualFee ? Math.round(annualFee * (1 + MEMBERSHIP_GST_PERCENT / 100)) : null;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatRupees = (n: number) => inr.format(n);

/** "6 months × ₹4,000 = ₹24,000 + 18% GST ₹4,320 = ₹28,320" */
export function describeQuote(q: FeeQuote): string {
  return `${q.months} month${q.months === 1 ? "" : "s"} × ${formatRupees(q.perMonth)} = ${formatRupees(q.subtotal)} + ${q.gstPercent}% GST ${formatRupees(q.gst)} = ${formatRupees(q.total)}`;
}
