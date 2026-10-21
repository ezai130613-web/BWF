"use client";

import { useActionState } from "react";
import { reassignApplicationChapter } from "@/app/admin/(dashboard)/applications/actions";

const initialState: { error?: string } = {};

export function ReassignChapterForm({
  applicationId,
  chapters,
}: {
  applicationId: string;
  chapters: { id: string; name: string; status: string }[];
}) {
  const [state, formAction, pending] = useActionState(reassignApplicationChapter, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Assign chapter
        <select name="chapterId" required className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15">
          <option value="">Select…</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.status === "DRAFT" ? "(internal, not yet public)" : ""}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
        {pending ? "Assigning…" : "Assign"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
