"use client";

import { useActionState, useEffect, useRef } from "react";
import { Users } from "lucide-react";
import { recordOneToOne } from "@/app/member/(portal)/one-to-ones/actions";
import type { PickerMember } from "@/lib/members/picker";
import { MemberPicker } from "@/components/member/member-picker";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; successes?: number } = {};

export function RecordOneToOneForm({ members }: { members: PickerMember[] }) {
  // `successes` keys the member picker, so it remounts (clears) after each
  // successful save — a form's native reset() can't clear React state.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof initialState, formData: FormData) => {
      const result = await recordOneToOne(prev, formData);
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
      icon={Users}
      title="Record a One-to-One"
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "One-to-One recorded."}
      submitLabel="Record One-to-One"
    >
      <div className="md:col-span-2">
        <MemberPicker key={state.successes ?? 0} members={members} name="withMemberId" label="Met with" />
      </div>
      <Field label="Notes (optional)" htmlFor="oto-notes" className="md:col-span-2">
        <textarea id="oto-notes" name="notes" rows={3} placeholder="What did you discuss?" className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
