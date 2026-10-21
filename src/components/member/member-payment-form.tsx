"use client";

import { useActionState, useState } from "react";
import { submitMemberPayment, type MemberPaymentState } from "@/app/member/(portal)/payments/actions";
import { MeetingPaymentFields, ProofFields } from "@/components/checkin/meeting-payment-fields";
import { FormStatus, inputClass, primaryButtonClass } from "@/components/member/ui";

const initialState: MemberPaymentState = {};

export function MemberPaymentForm({
  type,
  startMonth,
  membershipYears,
  defaultMembershipYear,
}: {
  type: "MEETING" | "MEMBERSHIP";
  startMonth: { month: number; year: number };
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
          It shows as Pending below until BWF verifies it. Once approved, you won&rsquo;t be asked to pay for these
          {type === "MEETING" ? " months at meeting check-in." : " again this year."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {type === "MEETING" ? (
        <MeetingPaymentFields startMonth={startMonth} />
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
          <ProofFields />
        </>
      )}
      <FormStatus error={state?.error} />
      <button type="submit" disabled={pending} className={`${primaryButtonClass} self-start`}>
        {pending ? "Submitting…" : "Submit payment"}
      </button>
    </form>
  );
}
