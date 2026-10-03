"use client";

import { useActionState, useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { recordConsumer } from "@/app/member/(portal)/consumers/actions";
import { ActivityFormShell } from "@/components/member/activity-form-shell";
import { Field, inputClass } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean } = {};

export function RecordConsumerForm() {
  const [state, formAction, pending] = useActionState(recordConsumer, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <ActivityFormShell
      icon={ShoppingBag}
      title="Record a Consumer"
      description="You brought an end consumer — someone with a real construction requirement, not a prospective member — to a meeting."
      formRef={formRef}
      action={formAction}
      pending={pending}
      error={state?.error}
      success={state?.success && "Consumer recorded."}
      submitLabel="Record Consumer"
    >
      <Field label="Consumer's name" htmlFor="cons-name">
        <input id="cons-name" name="name" required className={inputClass} />
      </Field>
      <Field label="Company (optional)" htmlFor="cons-company">
        <input id="cons-company" name="company" className={inputClass} />
      </Field>
      <Field label="Phone (optional)" htmlFor="cons-phone">
        <input id="cons-phone" name="phone" type="tel" className={inputClass} />
      </Field>
      <Field label="Notes (optional)" htmlFor="cons-notes">
        <input id="cons-notes" name="notes" placeholder="Their requirement" className={inputClass} />
      </Field>
    </ActivityFormShell>
  );
}
