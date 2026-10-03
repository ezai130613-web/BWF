"use client";

import { useActionState, useEffect, useRef } from "react";
import { Receipt } from "lucide-react";
import { recordThankYouSlip } from "@/app/member/(portal)/thank-you-slips/actions";
import type { PickerMember } from "@/lib/members/picker";
import { MemberPicker } from "@/components/member/member-picker";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; successes?: number } = {};

type ReferralOption = { id: string; fromMemberName: string; createdAt: Date };

export function RecordThankYouSlipForm({
  members,
  receivedReferrals,
}: {
  members: PickerMember[];
  receivedReferrals: ReferralOption[];
}) {
  // `successes` keys the member picker, so it remounts (clears) after each
  // successful save — a form's native reset() can't clear React state.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialState, formData: FormData) => {
      const result = await recordThankYouSlip(prev, formData);
      return { ...result, successes: (prev.successes ?? 0) + (result?.success ? 1 : 0) };
    },
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <ActivityFormShell
      icon={Receipt}
      title="Add a Thank You Slip"
      description="You received business through a BWF referral — thank the member who passed it."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Thank You Slip recorded."}
      submitLabel="Record Thank You Slip"
    >
      <div className="md:col-span-2">
        <MemberPicker key={state.successes ?? 0} members={members} name="toMemberId" label="Thanking" />
      </div>
      <Field label="Business value (₹)" htmlFor="tys-amount">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-neutral-500">₹</span>
          <input id="tys-amount" name="amountInr" type="number" inputMode="numeric" min="1" required className={`${inputClass} pl-8`} />
        </div>
      </Field>
      {receivedReferrals.length > 0 ? (
        <Field label="Link to a referral you received (optional)" htmlFor="tys-referral">
          <select id="tys-referral" name="referralId" defaultValue="" className={inputClass}>
            <option value="">None</option>
            {receivedReferrals.map((r) => (
              <option key={r.id} value={r.id}>
                From {r.fromMemberName} — {r.createdAt.toLocaleDateString("en-IN")}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Description (optional)" htmlFor="tys-description" className="md:col-span-2">
        <textarea id="tys-description" name="description" rows={3} placeholder="What was the business — e.g. order details" className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
