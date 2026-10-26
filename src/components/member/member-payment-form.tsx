"use client";

import { useActionState, useState } from "react";
import { submitMemberPayment, type MemberPaymentState } from "@/app/member/(portal)/payments/actions";
import { MeetingPaymentFields, ProofFields } from "@/components/checkin/meeting-payment-fields";
import { FormStatus, inputClass, primaryButtonClass } from "@/components/member/ui";

const initialState: MemberPaymentState = {};

export function MemberPaymentForm({
  type,
  startMonth,
  monthlyFee,
  membershipTotal,
  membershipYears,
  defaultMembershipYear,
}: {
  type: "MEETING" | "MEMBERSHIP";
  startMonth: { month: number; year: number };
  /** Phase 40 — the monthly fee (before GST) and annual total (incl. GST), for pre-filling the amount. */
  monthlyFee: number | null;
  membershipTotal: number | null;
  membershipYears: number[];
  defaultMembershipYear: number;
}) {
  const [state, formAction, pending] = useActionState(submitMemberPayment.bind(null, type), initialState);
  // One key per form mount (same duplicate-submit protection as check-in).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-900">Payment submitted for review.</p>
        <p className="mt-1 text-sm text-emerald-700">
          It shows as awaiting approval until BWF verifies it.{" "}
          {type === "MEETING" ? "Once approved, each month it covers gets a tick." : "Once approved, your membership shows as paid."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {type === "MEETING" ? (
        <MeetingPaymentFields startMonth={startMonth} monthlyFee={monthlyFee} />
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Membership year
            <select name="membershipYear" defaultValue={defaultMembershipYear} className={inputClass}>
              {membershipYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <ProofFields defaultAmount={membershipTotal} />
        </>
      )}
      <FormStatus error={state?.error} />
      <button type="submit" disabled={pending} className={`${primaryButtonClass} self-start`}>
        {pending ? "Submitting…" : "Submit payment"}
      </button>
    </form>
  );
}
