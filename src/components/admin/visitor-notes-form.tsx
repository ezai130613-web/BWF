"use client";

import { useActionState } from "react";
import { updateVisitorNotes } from "@/app/admin/(dashboard)/visitors/actions";

const initialState: { error?: string } = {};

export function VisitorNotesForm({ visitorId, notes }: { visitorId: string; notes: string | null }) {
  const [state, formAction, pending] = useActionState(updateVisitorNotes, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="visitorId" value={visitorId} />
      <textarea
        name="notes"
        rows={4}
        defaultValue={notes ?? ""}
        placeholder="Internal notes — follow-ups, conversation outcomes, etc."
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
      />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
