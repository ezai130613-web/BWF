"use client";

import { useActionState, useEffect, useRef } from "react";
import { Rocket } from "lucide-react";
import { recordPowerDate } from "@/app/member/(portal)/power-dates/actions";
import type { PickerMember } from "@/lib/members/picker";
import { MemberPicker } from "@/components/member/member-picker";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; successes?: number } = {};

export function RecordPowerDateForm({ members }: { members: PickerMember[] }) {
  // `successes` keys the member picker, so it remounts (clears) after each
  // successful save — a form's native reset() can't clear React state.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialState, formData: FormData) => {
      const result = await recordPowerDate(prev, formData);
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
      icon={Rocket}
      title="Add a Power Date"
      description="You took a fellow member to meet your own external connection. Took more than one member? Record one Power Date each."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Power Date recorded."}
      submitLabel="Record Power Date"
    >
      <div className="md:col-span-2">
        <MemberPicker key={state.successes ?? 0} members={members} name="participantMemberId" label="Fellow member you brought" />
      </div>
      <Field label="External contact's name" htmlFor="pd-name">
        <input id="pd-name" name="externalContactName" required className={inputClass} />
      </Field>
      <Field label="Their company (optional)" htmlFor="pd-company">
        <input id="pd-company" name="externalContactCompany" className={inputClass} />
      </Field>
      <Field label="Notes (optional)" htmlFor="pd-notes" className="md:col-span-2">
        <textarea id="pd-notes" name="notes" rows={3} className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
