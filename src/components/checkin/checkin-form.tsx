"use client";

import { useActionState, useState } from "react";
import { checkIn } from "@/app/member/(portal)/checkin/[token]/actions";
import { MeetingPaymentFields } from "@/components/checkin/meeting-payment-fields";

const initialState: { error?: string; success?: boolean } = {};

export function CheckinForm({
  token,
  alreadyPresent,
  paymentCovered = false,
  startMonth,
}: {
  token: string;
  alreadyPresent: boolean;
  /**
   * The meeting's month is already covered by an APPROVED payment
   * (2026-10-21: "if a member pays for the next 6 months, it shouldn't
   * keep showing them every meeting") — the payment question is skipped
   * and the form is a one-tap check-in.
   */
  paymentCovered?: boolean;
  /** First month pre-filled in the months-covered pickers (the meeting's month). */
  startMonth: { month: number; year: number };
}) {
  const [state, formAction, pending] = useActionState(checkIn.bind(null, token), initialState);

  // Generated once per form mount — a retried/double-clicked submit reuses
  // the same key, letting the server recognize and no-op the duplicate
  // (spec: "Prevent duplicate payment submissions caused by repeated clicks
  // or retries").
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [madePayment, setMadePayment] = useState<"yes" | "no" | null>(paymentCovered ? "no" : alreadyPresent ? "yes" : null);

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

      {paymentCovered ? (
        <input type="hidden" name="madePayment" value="no" />
      ) : !alreadyPresent ? (
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
          <MeetingPaymentFields startMonth={startMonth} />
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      {madePayment === null ? null : (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Submitting…" : paymentCovered ? "Check In" : alreadyPresent ? "Submit Payment" : "Submit"}
        </button>
      )}
    </form>
  );
}
