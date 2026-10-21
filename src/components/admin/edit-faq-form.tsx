"use client";

import { useActionState } from "react";
import { deleteFaq, toggleFaqActive, updateFaq } from "@/app/admin/(dashboard)/faqs/actions";

const initialState: { error?: string } = {};

export function EditFaqForm({ faq }: { faq: { id: string; question: string; answer: string; isActive: boolean } }) {
  const [state, formAction, pending] = useActionState(updateFaq.bind(null, faq.id), initialState);

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-4">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Question
          <input
            name="question"
            defaultValue={faq.question}
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Answer
          <textarea
            name="answer"
            defaultValue={faq.answer}
            required
            rows={3}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>

        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      {/* Siblings, not nested inside the edit form above — HTML doesn't allow nested <form>s. */}
      <div className="mt-3 flex items-center gap-4">
        <form action={toggleFaqActive.bind(null, faq.id)}>
          <button type="submit" className="text-sm text-neutral-500 hover:text-emerald-800">
            {faq.isActive ? "Hide" : "Show"}
          </button>
        </form>

        <form action={deleteFaq.bind(null, faq.id)}>
          <button type="submit" className="text-sm text-red-600 hover:text-red-800">
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
