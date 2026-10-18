const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Formats a plain digit string (as stored in WebsiteContent) as ₹ with Indian digit grouping. */
export function formatInr(value: string | null): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return inrFormatter.format(n);
}

/** ₹ crores for the homepage's "Total Business Generated" counter — e.g. 257500000 -> "25.75". */
export function toCrores(value: number): number {
  return Math.round((value / 1e7) * 100) / 100;
}

/** Appends the spec's "+ GST" note to a formatted ₹ price (visitor fees, all "+ gst" per §5 2026-09-09 correction). */
export function withGst(price: string | null): string {
  return price ? `${price} + GST` : "TBC";
}

/** GST rate on the annual membership fee (client, 2026-10-19: "20k plus GST 18%"). */
export const MEMBERSHIP_GST_PERCENT = 18;

/**
 * The annual membership fee as "₹20,000 + 18% GST" plus the GST-inclusive
 * total ("₹23,600") — or nulls when the Fees setting isn't a plain number.
 */
export function formatAnnualMembershipFee(value: string | null): { base: string; withGst: string; total: string } | null {
  const base = formatInr(value);
  if (!base) return null;
  const total = formatInr(String(Math.round(Number(value) * (1 + MEMBERSHIP_GST_PERCENT / 100))))!;
  return { base, withGst: `${base} + ${MEMBERSHIP_GST_PERCENT}% GST`, total };
}
