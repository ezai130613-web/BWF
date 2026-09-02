"use client";

import { useActionState } from "react";
import { createFaq } from "@/app/admin/(dashboard)/faqs/actions";

const initialState: { error?: string } = {};

export function CreateFaqForm() {
  const [state, formAction, pending] = useActionState(createFaq, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Question
        <input name="question" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Answer
        <textarea name="answer" rows={3} required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="self-start rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "Adding…" : "Add FAQ"}
      </button>
    </form>
  );
}
