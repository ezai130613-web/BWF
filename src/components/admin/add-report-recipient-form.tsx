"use client";

import { useActionState, useState } from "react";
import { addReportRecipient } from "@/app/admin/(dashboard)/reports/actions";

const initialState: { error?: string } = {};

export function AddReportRecipientForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(addReportRecipient, initialState);
  const [scope, setScope] = useState<"MASTER" | "CHAPTER">("MASTER");

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Report
        <select
          name="scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as "MASTER" | "CHAPTER")}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="MASTER">Master (all chapters)</option>
          <option value="CHAPTER">One chapter</option>
        </select>
      </label>
      {scope === "CHAPTER" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Chapter
          <select
            name="chapterId"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Select…</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div />
      )}

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}

      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add recipient"}
        </button>
      </div>
    </form>
  );
}
