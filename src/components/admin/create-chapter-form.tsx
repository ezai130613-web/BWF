"use client";

import { useActionState } from "react";
import { createChapter } from "@/app/admin/(dashboard)/chapters/actions";

const initialState: { error?: string } = {};

export function CreateChapterForm() {
  const [state, formAction, pending] = useActionState(createChapter, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Location (optional)
        <input
          name="location"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add chapter (draft)"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
