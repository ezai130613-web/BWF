"use client";

import { useState } from "react";
import { PaymentProofField } from "@/components/checkin/payment-proof-field";
import { describeQuote, formatRupees, quoteMeetingFee } from "@/lib/payments/fees";
import { formatDateKey } from "@/lib/payments/dates";

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const inputClass =
  "w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none";

/**
 * 2026-11-03 — meeting fee by meetings, not calendar months. Dropdown 1:
 * how many months (1–12; 1 month = the chapter's meetings in a month, 2
 * today). Below it: the exact meetings that pays for — the member's next
 * unpaid meetings from today (or from their joining date), so someone who
 * joins mid-month pays this month's second meeting + next month's first.
 * The server recomputes the same dates from `monthsToPay`; this list is the
 * preview. With `withProof`, the amount/date/screenshot fields follow
 * (screenshot flow, used until Razorpay is switched on).
 */
export function MeetingPaymentFields({
  upcoming,
  perMonth,
  monthlyFee = null,
  withProof = true,
  onMonthsChange,
}: {
  /** Unpaid meeting days, "YYYY-MM-DD", soonest first (at least 12 months' worth). */
  upcoming: string[];
  perMonth: number;
  monthlyFee?: number | null;
  withProof?: boolean;
  onMonthsChange?: (months: number) => void;
}) {
  const [months, setMonths] = useState(1);
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const quote = quoteMeetingFee(monthlyFee, months);
  const amount = typedAmount ?? (quote ? String(quote.total) : "");
  const covered = upcoming.slice(0, months * perMonth);

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        How many months do you want to pay for?
        <select
          name="monthsToPay"
          value={months}
          onChange={(e) => {
            setMonths(Number(e.target.value));
            onMonthsChange?.(Number(e.target.value));
          }}
          className={inputClass}
        >
          {MONTH_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} month{n === 1 ? "" : "s"} ({n * perMonth} meetings)
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-neutral-700">
          Meetings this pays for ({covered.length})
        </p>
        {covered.length ? (
          <ul className="max-h-48 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
            {covered.map((d) => (
              <li key={d} className="py-0.5">
                {formatDateKey(d)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-red-700">No upcoming meetings were found for your chapter — please contact BWF.</p>
        )}
        {covered.length < months * perMonth && covered.length ? (
          <p className="text-xs text-amber-700">Only {covered.length} upcoming meetings are scheduled so far.</p>
        ) : null}
      </div>

      {quote ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">Amount to pay: {formatRupees(quote.total)}</p>
          <p className="mt-0.5 text-xs text-emerald-800">{describeQuote(quote)}</p>
        </div>
      ) : null}

      {withProof ? (
        <ProofFields
          amount={amount}
          onAmountChange={setTypedAmount}
          amountNote={
            quote && typedAmount !== null && Number(typedAmount) !== quote.total
              ? `This differs from the calculated ${formatRupees(quote.total)} — BWF will check it when approving.`
              : null
          }
        />
      ) : null}
    </>
  );
}

/**
 * Amount, payment date and proof upload — shared by the meeting and annual
 * membership forms. Pass `amount` + `onAmountChange` for a pre-filled
 * (still editable) amount, or `defaultAmount` for a one-off pre-fill.
 */
export function ProofFields({
  amount,
  onAmountChange,
  defaultAmount,
  amountNote,
}: {
  amount?: string;
  onAmountChange?: (value: string) => void;
  defaultAmount?: number | null;
  amountNote?: string | null;
} = {}) {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Amount paid (INR, total for this payment)
        {onAmountChange ? (
          <input
            type="number"
            name="amountPaidInr"
            required
            min={1}
            step="0.01"
            value={amount ?? ""}
            onChange={(e) => onAmountChange(e.target.value)}
            className={inputClass}
          />
        ) : (
          <input type="number" name="amountPaidInr" required min={1} step="0.01" defaultValue={defaultAmount ?? undefined} className={inputClass} />
        )}
        {amountNote ? <span className="text-xs font-normal text-amber-700">{amountNote}</span> : null}
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Actual payment date
        <input type="date" name="actualPaymentDate" required className={inputClass} />
      </label>

      <PaymentProofField name="proofUrl" />
    </>
  );
}
