"use client";

import { useState, useTransition } from "react";
import { createChiefGuestQuick } from "@/app/admin/(dashboard)/chief-guests/actions";

/**
 * Inline "add a Chief Guest without leaving the Meetings page" (client
 * correction, 2026-09-15) — the full /admin/chief-guests form has more
 * fields (photo, description, display order); this is deliberately just
 * the minimum needed to pick someone for a meeting.
 *
 * Always visible (client correction: "constantly appearing, not just when
 * I select the chapter") — when `chapters` is given, the mini-form carries
 * its own Chapter picker (defaulting to `defaultChapterId`, editable) so
 * it never depends on the parent's own Chapter field being filled in yet.
 * Omit `chapters` (edit-meeting context, where the chapter is fixed) to
 * skip that picker and lock straight to `defaultChapterId`.
 *
 * Deliberately NOT a `<form>` — it lives right beside the Chief Guest
 * select, inside the meeting form's own `<form>`, and HTML doesn't allow
 * a nested `<form>`. `createChiefGuestQuick` is still a real Server
 * Action; it's just invoked directly (React's documented pattern for
 * calling one outside a form) rather than via `action={}`.
 */
export function QuickAddChiefGuestForm({
  chapters,
  defaultChapterId,
  onCreated,
}: {
  chapters?: { id: string; name: string }[];
  defaultChapterId: string;
  onCreated: (guest: { id: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  // null = "track the parent's current chapter selection" (derived, not
  // synced via an effect); becomes a real id once the admin actually picks
  // one in here, which then sticks even if the parent's own selection changes.
  const [manualChapterId, setManualChapterId] = useState<string | null>(null);
  const chapterId = manualChapterId ?? defaultChapterId;
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setManualChapterId(null);
  }

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

  const needsChapter = !!chapters;
  const canSubmit = name.trim() && company.trim() && (!needsChapter || chapterId);

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
      close();
    });
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      {needsChapter ? (
        <select
          value={chapterId}
          onChange={(e) => setManualChapterId(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select a chapter…</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}
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
          disabled={pending || !canSubmit}
          className="self-start rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Chief Guest"}
        </button>
        <button type="button" onClick={close} className="text-xs text-neutral-500 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
