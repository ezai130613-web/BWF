"use client";

import { useActionState, useEffect, useState } from "react";
import {
  startOnlinePayment,
  submitMemberPayment,
  type MemberPaymentState,
  type OnlinePaymentState,
} from "@/app/member/(portal)/payments/actions";
import { MeetingPaymentFields, ProofFields } from "@/components/checkin/meeting-payment-fields";
import { FormStatus, inputClass, primaryButtonClass } from "@/components/member/ui";
import { formatRupees, quoteMeetingFee } from "@/lib/payments/fees";

const initialState: MemberPaymentState = {};
const initialOnline: OnlinePaymentState = {};

/**
 * Member payment form. 2026-11-03: the meeting fee is chosen as "how many
 * months" and shows the exact meetings it covers. With Razorpay switched on
 * (`online`), the member pays on Razorpay and it's approved automatically;
 * otherwise they upload a screenshot for BWF to approve, as before.
 */
export function MemberPaymentForm({
  type,
  upcoming,
  perMonth,
  monthlyFee,
  membershipTotal,
  membershipYears,
  defaultMembershipYear,
  online,
}: {
  type: "MEETING" | "MEMBERSHIP";
  upcoming: string[];
  perMonth: number;
  /** The monthly fee (before GST) and annual total (incl. GST). */
  monthlyFee: number | null;
  membershipTotal: number | null;
  membershipYears: number[];
  defaultMembershipYear: number;
  online: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitMemberPayment.bind(null, type), initialState);
  const [onlineState, onlineAction, onlinePending] = useActionState(startOnlinePayment.bind(null, type), initialOnline);
  // One key per form mount (same duplicate-submit protection as check-in).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [months, setMonths] = useState(1);

  useEffect(() => {
    if (onlineState?.url) window.location.href = onlineState.url;
  }, [onlineState?.url]);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-900">Payment submitted for review.</p>
        <p className="mt-1 text-sm text-emerald-700">
          It shows as awaiting approval until BWF verifies it.{" "}
          {type === "MEETING" ? "Once approved, the meetings it covers are marked paid." : "Once approved, your membership shows as paid."}
        </p>
      </div>
    );
  }

  const onlineTotal = type === "MEETING" ? (quoteMeetingFee(monthlyFee, months)?.total ?? null) : membershipTotal;
  const busy = online ? onlinePending || Boolean(onlineState?.url) : pending;

  return (
    <form action={online ? onlineAction : formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {type === "MEETING" ? (
        <MeetingPaymentFields upcoming={upcoming} perMonth={perMonth} monthlyFee={monthlyFee} withProof={!online} onMonthsChange={setMonths} />
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
          {online ? (
            membershipTotal ? (
              <p className="text-sm text-neutral-700">
                Amount: <span className="font-semibold text-neutral-900">{formatRupees(membershipTotal)}</span> (incl. GST)
              </p>
            ) : null
          ) : (
            <ProofFields defaultAmount={membershipTotal} />
          )}
        </>
      )}
      <FormStatus error={online ? onlineState?.error : state?.error} />
      <button type="submit" disabled={busy} className={`${primaryButtonClass} self-start`}>
        {online
          ? busy
            ? "Opening Razorpay…"
            : `Pay ${onlineTotal ? formatRupees(onlineTotal) : ""} online`.replace("  ", " ")
          : pending
            ? "Submitting…"
            : "Submit payment"}
      </button>
      {online ? (
        <p className="text-xs text-neutral-500">
          You&apos;ll pay securely on Razorpay (UPI, card or net banking). It&apos;s marked paid as soon as Razorpay confirms — no screenshot needed.
        </p>
      ) : null}
    </form>
  );
}
