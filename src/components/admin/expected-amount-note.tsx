const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/**
 * Phase 40 — the amount a member's payment should have come to (months ×
 * monthly fee + GST, worked out when they submitted), next to what they
 * entered. Members can edit the amount, so a mismatch is flagged rather
 * than blocked.
 */
export function ExpectedAmountNote({ paid, expected }: { paid: number; expected: number | null }) {
  if (expected === null) return null;
  const diff = Math.round(paid - expected);
  if (diff === 0) return <span className="block text-xs font-normal text-emerald-700">✓ Matches the fee</span>;
  return (
    <span className="block text-xs font-medium text-amber-700">
      Expected {money.format(expected)} ({money.format(Math.abs(diff))} {diff > 0 ? "more" : "less"})
    </span>
  );
}
