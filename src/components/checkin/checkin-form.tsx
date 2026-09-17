"use client";

import { useActionState, useState } from "react";
import { checkIn } from "@/app/member/(portal)/checkin/[token]/actions";
import { PaymentProofField } from "@/components/checkin/payment-proof-field";

const initialState: { error?: string; success?: boolean } = {};

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inputClass =
  "w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export function CheckinForm({
  token,
  alreadyPresent,
  numberOfMonthsOptions,
}: {
  token: string;
  alreadyPresent: boolean;
  numberOfMonthsOptions: number[];
}) {
  const [state, formAction, pending] = useActionState(checkIn.bind(null, token), initialState);

  // Generated once per form mount — a retried/double-clicked submit reuses
  // the same key, letting the server recognize and no-op the duplicate
  // (spec: "Prevent duplicate payment submissions caused by repeated clicks
  // or retries").
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [madePayment, setMadePayment] = useState<"yes" | "no" | null>(alreadyPresent ? "yes" : null);
  const [monthsChoice, setMonthsChoice] = useState<string>("1");
  const [customMonths, setCustomMonths] = useState("");

  const numberOfMonths = monthsChoice === "other" ? Number(customMonths) || 0 : Number(monthsChoice);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-900">
          {alreadyPresent ? "Payment submitted for review." : "You're checked in as Present."}
        </p>
        {madePayment === "yes" ? (
          <p className="mt-2 text-sm text-emerald-700">
            Your payment is pending review — you&rsquo;ll see its status once BWF verifies it.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {!alreadyPresent ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-neutral-700">Have you made a payment?</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="radio"
                name="madePayment"
                value="yes"
                checked={madePayment === "yes"}
                onChange={() => setMadePayment("yes")}
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="radio"
                name="madePayment"
                value="no"
                checked={madePayment === "no"}
                onChange={() => setMadePayment("no")}
              />
              No
            </label>
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="madePayment" value="yes" />
      )}

      {madePayment === "yes" ? (
        <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Number of months
            <select value={monthsChoice} onChange={(e) => setMonthsChoice(e.target.value)} className={inputClass}>
              {numberOfMonthsOptions.map((n) => (
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
              <input
                type="number"
                min={1}
                value={customMonths}
                onChange={(e) => setCustomMonths(e.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}

          <input type="hidden" name="numberOfMonths" value={numberOfMonths || ""} />

          {numberOfMonths > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-neutral-700">Exact months covered</p>
              {Array.from({ length: numberOfMonths }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <select name={`month_${i}`} required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Month…
                    </option>
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
                    defaultValue={new Date().getFullYear()}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Amount paid (INR, total for this payment)
            <input type="number" name="amountPaidInr" required min={1} step="0.01" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Actual payment date
            <input type="date" name="actualPaymentDate" required className={inputClass} />
          </label>

          <PaymentProofField name="proofUrl" />
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      {madePayment === null ? null : (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Submitting…" : alreadyPresent ? "Submit Payment" : "Submit"}
        </button>
      )}
    </form>
  );
}
