"use client";

import { useState } from "react";
import { PaymentProofField } from "@/components/checkin/payment-proof-field";
import { describeQuote, formatRupees, quoteMeetingFee } from "@/lib/payments/fees";

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NUMBER_OF_MONTHS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const inputClass =
  "w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none";

/** Month n after `start` (0 = start itself), 1-based month. */
function addMonths(start: { month: number; year: number }, n: number) {
  const index = start.month - 1 + n;
  return { month: (index % 12) + 1, year: start.year + Math.floor(index / 12) };
}

/**
 * Number of months + exact months covered (pre-filled as consecutive
 * months from `startMonth`, still editable since months need not be
 * consecutive), amount, payment date and proof upload. Field names match
 * parseMeetingPaymentFields() in src/lib/payments/member-payments.ts.
 *
 * Phase 40 — with the monthly fee known, the amount is pre-filled with
 * months × fee + 18% GST and follows the month count until the member types
 * their own amount (it stays editable).
 */
export function MeetingPaymentFields({
  startMonth,
  monthlyFee = null,
}: {
  startMonth: { month: number; year: number };
  monthlyFee?: number | null;
}) {
  const [monthsChoice, setMonthsChoice] = useState<string>("1");
  const [customMonths, setCustomMonths] = useState("");
  const [typedAmount, setTypedAmount] = useState<string | null>(null);

  const numberOfMonths = monthsChoice === "other" ? Math.min(Number(customMonths) || 0, 24) : Number(monthsChoice);
  const quote = quoteMeetingFee(monthlyFee, numberOfMonths);
  const amount = typedAmount ?? (quote ? String(quote.total) : "");

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Number of months
        <select value={monthsChoice} onChange={(e) => setMonthsChoice(e.target.value)} className={inputClass}>
          {NUMBER_OF_MONTHS_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="other">Other</option>
        </select>
      </label>

      {monthsChoice === "other" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          How many months?
          <input type="number" min={1} max={24} value={customMonths} onChange={(e) => setCustomMonths(e.target.value)} className={inputClass} />
        </label>
      ) : null}

      <input type="hidden" name="numberOfMonths" value={numberOfMonths || ""} />

      {numberOfMonths > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-neutral-700">Exact months covered</p>
          {Array.from({ length: numberOfMonths }).map((_, i) => {
            const preset = addMonths(startMonth, i);
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                <select name={`month_${i}`} required defaultValue={preset.month} className={inputClass}>
                  {MONTH_LABELS.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name={`year_${i}`}
                  required
                  min={2000}
                  max={2100}
                  placeholder="Year"
                  defaultValue={preset.year}
                  className={inputClass}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {quote ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">Amount to pay: {formatRupees(quote.total)}</p>
          <p className="mt-0.5 text-xs text-emerald-800">{describeQuote(quote)}</p>
        </div>
      ) : null}

      <ProofFields
        amount={amount}
        onAmountChange={setTypedAmount}
        amountNote={
          quote && typedAmount !== null && Number(typedAmount) !== quote.total
            ? `This differs from the calculated ${formatRupees(quote.total)} — BWF will check it when approving.`
            : null
        }
      />
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
