"use client";

import { useState } from "react";
import { PaymentProofField } from "@/components/checkin/payment-proof-field";

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
 */
export function MeetingPaymentFields({ startMonth }: { startMonth: { month: number; year: number } }) {
  const [monthsChoice, setMonthsChoice] = useState<string>("1");
  const [customMonths, setCustomMonths] = useState("");

  const numberOfMonths = monthsChoice === "other" ? Math.min(Number(customMonths) || 0, 24) : Number(monthsChoice);

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

      <ProofFields />
    </>
  );
}

/** Amount, payment date and proof upload — shared by the meeting and annual membership forms. */
export function ProofFields() {
  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Amount paid (INR, total for this payment)
        <input type="number" name="amountPaidInr" required min={1} step="0.01" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Actual payment date
        <input type="date" name="actualPaymentDate" required className={inputClass} />
      </label>

      <PaymentProofField name="proofUrl" />
    </>
  );
}
