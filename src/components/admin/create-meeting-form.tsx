"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createMeeting } from "@/app/admin/(dashboard)/meetings/actions";

const initialState: { error?: string } = {};

export function CreateMeetingForm({
  chapters,
  chiefGuests,
}: {
  chapters: { id: string; name: string }[];
  chiefGuests: { id: string; name: string; chapterId: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const [chapterId, setChapterId] = useState("");

  const availableChiefGuests = chiefGuests.filter((g) => !chapterId || g.chapterId === null || g.chapterId === chapterId);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Title
        <input
          name="title"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chapter
        <select
          name="chapterId"
          required
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
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
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Date &amp; time
        <input
          name="startsAt"
          type="datetime-local"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Venue
        <input
          name="venue"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Address
        <input
          name="address"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Google Maps URL
        <input
          name="googleMapsUrl"
          type="url"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chief Guest
        <select
          name="chiefGuestId"
          defaultValue=""
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">None</option>
          {availableChiefGuests.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {chapterId && availableChiefGuests.length === 0 ? (
          <span className="text-xs text-neutral-500">
            No Chief Guests for this chapter yet — add one at{" "}
            <a href="/admin/chief-guests" target="_blank" rel="noopener noreferrer" className="underline">
              Chief Guests
            </a>
            .
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Agenda
        <input
          name="agenda"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add meeting"}
        </button>
      </div>
    </form>
  );
}
