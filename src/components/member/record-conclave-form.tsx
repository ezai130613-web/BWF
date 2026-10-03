"use client";

import { useActionState, useEffect, useRef } from "react";
import { UsersRound } from "lucide-react";
import { recordConclave } from "@/app/member/(portal)/conclaves/actions";
import type { PickerMember } from "@/lib/members/picker";
import { MemberPicker } from "@/components/member/member-picker";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; successes?: number } = {};

export function RecordConclaveForm({ members }: { members: PickerMember[] }) {
  // `successes` keys the member picker, so it remounts (clears) after each
  // successful save — a form's native reset() can't clear React state.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialState, formData: FormData) => {
      const result = await recordConclave(prev, formData);
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
      icon={UsersRound}
      title="Record a Conclave"
      description="Three or more members meeting together. Add at least 2 fellow members — pick each one through chapter and category."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Conclave recorded."}
      submitLabel="Record Conclave"
    >
      <div className="md:col-span-2">
        <MemberPicker key={state.successes ?? 0} members={members} name="participantMemberIds" label="Fellow members" multiple />
      </div>
      <Field label="Location (optional)" htmlFor="cc-location">
        <input id="cc-location" name="location" placeholder="Member's office, project site, etc." className={inputClass} />
      </Field>
      <Field label="Notes (optional)" htmlFor="cc-notes">
        <input id="cc-notes" name="notes" className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
