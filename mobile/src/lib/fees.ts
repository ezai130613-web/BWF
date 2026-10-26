/** Phase 40 — same arithmetic as the website's quoteMeetingFee(): months × monthly fee + GST, whole rupees. */
export function quoteMeetingFee(monthlyFee: number | null | undefined, months: number, gstPercent: number) {
  if (!monthlyFee || months < 1) return null;
  const subtotal = Math.round(monthlyFee * months);
  const gst = Math.round((subtotal * gstPercent) / 100);
  return { perMonth: monthlyFee, months, subtotal, gst, total: subtotal + gst, gstPercent };
}
