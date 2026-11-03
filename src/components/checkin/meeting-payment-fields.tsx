"use client";

import { useState } from "react";
import { PaymentProofField } from "@/components/checkin/payment-proof-field";
import { describeQuote, formatRupees, packageLabel, plusGst, quoteMeetings, type MeetingPackage } from "@/lib/payments/fees";
import { formatDateKey } from "@/lib/payments/dates";

const inputClass =
  "w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none";

/**
 * 2026-11-03 — the meeting fee is a fixed meeting package (2, 6, 12 or 24
 * meetings — no months anywhere). Below the picker: the exact meetings it
 * pays for — the member's next unpaid meetings from today (or from their
 * joining date). The server recomputes the same dates from `meetingsToPay`;
 * this list is the preview. With `withProof`, the amount/date/screenshot fields follow
 * (screenshot flow, used until Razorpay is switched on).
 */
export function MeetingPaymentFields({
  upcoming,
  packages,
  withProof = true,
  onMeetingsChange,
}: {
  /** The packages the member can choose — only those with enough scheduled meetings (see availablePackages). */
  packages: MeetingPackage[];
  /** Unpaid meeting days, "YYYY-MM-DD", soonest first (at least 24). */
  upcoming: string[];
  withProof?: boolean;
  onMeetingsChange?: (meetings: number) => void;
}) {
  const [meetings, setMeetings] = useState<number>(packages[0]?.meetings ?? 0);
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const covered = upcoming.slice(0, meetings);
  const quote = quoteMeetings(meetings, packages);
  // The amount actually transferred, incl. GST — pre-fills the proof form.
  const amount = typedAmount ?? (quote ? String(quote.total) : "");

  if (!packages.length) {
    return <p className="text-sm text-red-700">Not enough upcoming meetings are scheduled for your chapter yet — please contact BWF.</p>;
  }

  return (
    <>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        How many meetings do you want to pay for?
        <select
          name="meetingsToPay"
          value={meetings}
          onChange={(e) => {
            setMeetings(Number(e.target.value));
            onMeetingsChange?.(Number(e.target.value));
          }}
          className={inputClass}
        >
          {packages.map((p) => (
            <option key={p.meetings} value={p.meetings}>
              {packageLabel(p)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-neutral-700">
          Meetings this pays for ({covered.length})
        </p>
        <ul className="max-h-48 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          {covered.map((d) => (
            <li key={d} className="py-0.5">
              {formatDateKey(d)}
            </li>
          ))}
        </ul>
      </div>

      {quote ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
          <p className="font-semibold">Amount: {plusGst(quote.subtotal)}</p>
          <p className="mt-0.5 text-xs text-emerald-800">{describeQuote(quote)}</p>
        </div>
      ) : null}

      {withProof ? (
        <ProofFields
          amount={amount}
          onAmountChange={setTypedAmount}
          amountNote={
            quote && typedAmount !== null && Number(typedAmount) !== quote.total
              ? `This differs from ${plusGst(quote.subtotal)} (${formatRupees(quote.total)} with GST) — BWF will check it when approving.`
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
        Amount paid (INR, incl. GST)
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
