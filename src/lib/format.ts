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
