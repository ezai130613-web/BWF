"use client";

import { useActionState, useRef, useState } from "react";
import { createChiefGuestQuick } from "@/app/admin/(dashboard)/chief-guests/actions";

const initialState: { error?: string; chiefGuest?: { id: string; name: string } } = {};

/**
 * Inline "add a Chief Guest without leaving the Meetings page" (client
 * correction, 2026-09-15) — the full /admin/chief-guests form has more
 * fields (photo, description, display order); this is deliberately just
 * the minimum needed to pick someone for a meeting. The newly created
 * guest shows up in the parent's `chiefGuests` list automatically (any
 * Server Action completing refreshes the page's server data) — the parent
 * watches for a new id and auto-selects it, not this component's job.
 */
export function QuickAddChiefGuestForm({ chapterId }: { chapterId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createChiefGuestQuick, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-xs text-neutral-500 underline hover:text-neutral-900"
      >
        + Add a new Chief Guest
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
    >
      <input type="hidden" name="chapterId" value={chapterId} />
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          name="name"
          placeholder="Name"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <input
          name="company"
          placeholder="Company / organisation"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <input
          name="designation"
          placeholder="Designation (optional)"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>
      <p className="text-xs text-neutral-500">
        Adds them to the Chief Guest catalog and selects them below. For a photo or more detail,
        edit them afterward at{" "}
        <a href="/admin/chief-guests" target="_blank" rel="noopener noreferrer" className="underline">
          Chief Guests
        </a>
        .
      </p>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Chief Guest"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
