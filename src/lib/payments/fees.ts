import { MEMBERSHIP_GST_PERCENT } from "@/lib/format";

/**
 * Phase 40 (2026-10-26) — what a payment should come to. The meeting fee is
 * a set of admin-editable meeting packages (below); the annual membership fee is an
 * admin-set plain number (Website Content → Fees); both carry 18% GST (client, 2026-10-26). The member's
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

/**
 * 2026-11-03 (client) — the meeting fee is sold only as meeting packages
 * (2, 6, 12, 24 meetings), never by month. For each package the admin sets
 * the fee and a discount (Website Content → Fees, stored as JSON under
 * `fees.meetingPackages`); final fee = fee − discount, before 18% GST.
 * Defaults below apply until the admin saves their own.
 */
export const MEETING_PACKAGE_SIZES: readonly number[] = [2, 6, 12, 24];
export const MAX_PACKAGE_MEETINGS = 24;
export const MEETING_PACKAGES_KEY = "fees.meetingPackages";

export type MeetingPackage = { meetings: number; fee: number; discount: number };

export const DEFAULT_MEETING_PACKAGES: MeetingPackage[] = [
  { meetings: 2, fee: 2000, discount: 0 },
  { meetings: 6, fee: 6000, discount: 500 },
  { meetings: 12, fee: 12000, discount: 1000 },
  { meetings: 24, fee: 24000, discount: 3000 },
];

export const isMeetingPackage = (meetings: number) => MEETING_PACKAGE_SIZES.includes(meetings);
export const finalFee = (p: MeetingPackage) => p.fee - p.discount;

/** Validates one package row; returns an error message or null. */
export function packageError(p: MeetingPackage): string | null {
  if (!Number.isFinite(p.fee) || p.fee <= 0) return `Enter the fees for ${p.meetings} meetings.`;
  if (!Number.isFinite(p.discount) || p.discount < 0) return `The discount for ${p.meetings} meetings can't be negative.`;
  if (p.discount >= p.fee) return `The discount for ${p.meetings} meetings must be less than its fees.`;
  return null;
}

/** The stored setting → all four packages; any missing/invalid row falls back to its default. */
export function parseMeetingPackages(value: string | null | undefined): MeetingPackage[] {
  let saved: unknown = null;
  try {
    saved = value ? JSON.parse(value) : null;
  } catch {
    saved = null;
  }
  const rows = Array.isArray(saved) ? saved : [];
  return DEFAULT_MEETING_PACKAGES.map((def) => {
    const row = rows.find((r) => r && typeof r === "object" && Number(r.meetings) === def.meetings);
    if (!row) return def;
    const p = { meetings: def.meetings, fee: Number(row.fee), discount: Number(row.discount ?? 0) };
    return packageError(p) ? def : p;
  });
}

export type FeeQuote = {
  meetings: number;
  /** The package's fees, before the discount. */
  original: number;
  discount: number;
  /** Final fee (fees − discount), before GST. */
  subtotal: number;
  gst: number;
  total: number;
  gstPercent: number;
};

/** The price of a package (2/6/12/24 meetings) plus GST, whole rupees. Null for any other count — there is no other way to pay. */
export function quoteMeetings(meetings: number, packages: MeetingPackage[]): FeeQuote | null {
  const pkg = isMeetingPackage(meetings) ? packages.find((p) => p.meetings === meetings) : undefined;
  if (!pkg) return null;
  const subtotal = finalFee(pkg);
  const gst = Math.round((subtotal * MEETING_FEE_GST_PERCENT) / 100);
  return { meetings, original: pkg.fee, discount: pkg.discount, subtotal, gst, total: subtotal + gst, gstPercent: MEETING_FEE_GST_PERCENT };
}

/** "6 meetings — ₹5,500 + GST (save ₹500)" — the package picker's option label. */
export function packageLabel(p: MeetingPackage): string {
  return `${p.meetings} meetings — ${plusGst(finalFee(p))}${p.discount ? ` (save ${formatRupees(p.discount)})` : ""}`;
}

/** The annual membership fee plus GST, rounded to whole rupees. */
export function quoteMembershipFee(annualFee: number | null): number | null {
  return annualFee ? Math.round(annualFee * (1 + MEMBERSHIP_GST_PERCENT / 100)) : null;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatRupees = (n: number) => inr.format(n);

/** Every price is shown before GST: "₹5,500 + GST". */
export const plusGst = (n: number) => `${formatRupees(n)} + GST`;

/** "2 meetings ₹2,000 + GST · 6 meetings ₹5,500 + GST · …" — fee line on the Payments pages. */
export function packagesSummary(packages: MeetingPackage[]): string {
  return packages.map((p) => `${p.meetings} meetings ${plusGst(finalFee(p))}`).join(" · ");
}

/** "6 meetings: ₹6,000 − ₹500 discount = ₹5,500 + GST. 18% GST is ₹990, so you pay ₹6,490 in all." */
export function describeQuote(q: FeeQuote): string {
  const base = q.discount ? `${formatRupees(q.original)} − ${formatRupees(q.discount)} discount = ${plusGst(q.subtotal)}` : plusGst(q.subtotal);
  return `${q.meetings} meetings: ${base}. ${q.gstPercent}% GST is ${formatRupees(q.gst)}, so you pay ${formatRupees(q.total)} in all.`;
}
