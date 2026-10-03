"use client";

import { useActionState, useEffect, useRef } from "react";
import { Award } from "lucide-react";
import { recordMemberChiefGuest } from "@/app/member/(portal)/chief-guests-brought/actions";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean } = {};

export function RecordChiefGuestForm() {
  const [state, formAction, pending] = useActionState(recordMemberChiefGuest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <ActivityFormShell
      icon={Award}
      title="Record a Chief Guest"
      description="You invited a business leader or decision-maker to a chapter meeting."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Chief Guest recorded."}
      submitLabel="Record Chief Guest"
    >
      <Field label="Chief Guest's name" htmlFor="cg-name">
        <input id="cg-name" name="name" required className={inputClass} />
      </Field>
      <Field label="Designation (optional)" htmlFor="cg-designation">
        <input id="cg-designation" name="designation" className={inputClass} />
      </Field>
      <Field label="Company (optional)" htmlFor="cg-company">
        <input id="cg-company" name="company" className={inputClass} />
      </Field>
      <Field label="Notes (optional)" htmlFor="cg-notes">
        <input id="cg-notes" name="notes" className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
