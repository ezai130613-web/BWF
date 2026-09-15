"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordMemberChiefGuest } from "@/app/member/(portal)/chief-guests-brought/actions";

const initialState: { error?: string; success?: boolean } = {};

export function RecordChiefGuestForm() {
  const [state, formAction, pending] = useActionState(recordMemberChiefGuest, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Record a Chief Guest</h2>
      <p className="text-xs text-neutral-500 sm:col-span-2">
        You invited a Chief Guest — a business leader or decision-maker — to a meeting.
      </p>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chief Guest&rsquo;s name
        <input
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Designation (optional)
        <input
          name="designation"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Company (optional)
        <input
          name="company"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Notes (optional)
        <input
          name="notes"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700 sm:col-span-2">Chief Guest recorded.</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Recording…" : "Record Chief Guest"}
        </button>
      </div>
    </form>
  );
}
