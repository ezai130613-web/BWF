"use client";

import { useActionState, useEffect, useRef } from "react";
import { Handshake } from "lucide-react";
import { recordReferral } from "@/app/member/(portal)/referrals/actions";
import type { PickerMember } from "@/lib/members/picker";
import { MemberPicker } from "@/components/member/member-picker";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; successes?: number } = {};

export function RecordReferralForm({ members }: { members: PickerMember[] }) {
  // `successes` keys the member picker, so it remounts (clears) after each
  // successful save — a form's native reset() can't clear React state.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialState, formData: FormData) => {
      const result = await recordReferral(prev, formData);
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
      icon={Handshake}
      title="Give a Referral"
      description="Pick the chapter, then the category, then the member you're passing the opportunity to."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Referral recorded — thank you for passing business."}
      submitLabel="Record Referral"
    >
      <div className="md:col-span-2">
        <MemberPicker key={state.successes ?? 0} members={members} name="toMemberId" label="Referred to" />
      </div>
      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="mb-1.5 text-sm font-medium text-neutral-800">Type of referral</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { value: "OUTSIDE", title: "Outside referral", hint: "Someone from your own network" },
            { value: "SELF", title: "Self / inside referral", hint: "You bought from them yourself" },
          ].map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-300 p-3.5 transition has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-50"
            >
              <input type="radio" name="type" value={o.value} defaultChecked={o.value === "OUTSIDE"} className="mt-0.5 h-4 w-4 accent-emerald-800" />
              <span>
                <span className="block text-sm font-medium text-neutral-900">{o.title}</span>
                <span className="block text-xs text-neutral-500">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Description (optional)" htmlFor="referral-description" className="md:col-span-2">
        <textarea
          id="referral-description"
          name="description"
          rows={3}
          placeholder="Who did you connect them with, or what did you need?"
          className={inputClass}
        />
      </Field>
    </ActivityFormShell>
  );
}
