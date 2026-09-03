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
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
      />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
