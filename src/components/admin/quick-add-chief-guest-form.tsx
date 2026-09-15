"use client";

import { useState, useTransition } from "react";
import { createChiefGuestQuick } from "@/app/admin/(dashboard)/chief-guests/actions";

/**
 * Inline "add a Chief Guest without leaving the Meetings page" (client
 * correction, 2026-09-15) — the full /admin/chief-guests form has more
 * fields (photo, description, display order); this is deliberately just
 * the minimum needed to pick someone for a meeting.
 *
 * Deliberately NOT a `<form>` — it lives inside the meeting form's own
 * `<form>` (so it can render right next to the Chief Guest select instead
 * of down at the very bottom, past Agenda/Description/Save — see the
 * client's own correction on this), and HTML doesn't allow a nested
 * `<form>`. `createChiefGuestQuick` is still a real Server Action; it's
 * just invoked directly (React's documented pattern for calling one
 * outside a form) rather than via `action={}`.
 */
export function QuickAddChiefGuestForm({
  chapterId,
  onCreated,
}: {
  chapterId: string;
  onCreated: (guest: { id: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

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

  function handleAdd() {
    setError(undefined);
    const formData = new FormData();
    formData.set("chapterId", chapterId);
    formData.set("name", name);
    formData.set("company", company);
    formData.set("designation", designation);

    startTransition(async () => {
      const result = await createChiefGuestQuick(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.chiefGuest) onCreated(result.chiefGuest);
      setName("");
      setCompany("");
      setDesignation("");
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company / organisation"
          required
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <input
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="Designation (optional)"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </div>
      <p className="text-xs text-neutral-500">
        Adds them to the Chief Guest catalog and selects them above. For a photo or more detail,
        edit them afterward at{" "}
        <a href="/admin/chief-guests" target="_blank" rel="noopener noreferrer" className="underline">
          Chief Guests
        </a>
        .
      </p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !name || !company}
          className="self-start rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Chief Guest"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
