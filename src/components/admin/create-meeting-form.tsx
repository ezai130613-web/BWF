"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createMeeting } from "@/app/admin/(dashboard)/meetings/actions";
import { QuickAddChiefGuestForm } from "@/components/admin/quick-add-chief-guest-form";

const initialState: { error?: string } = {};

export function CreateMeetingForm({
  chapters,
  chiefGuests,
  canManageChiefGuests,
  defaultChapterId,
}: {
  chapters: { id: string; name: string }[];
  chiefGuests: { id: string; name: string; chapterId: string | null }[];
  canManageChiefGuests: boolean;
  /** Roster Sheets' "+ Create a new meeting" link pre-scopes this form to the chapter it came from. */
  defaultChapterId?: string;
}) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const [chapterId, setChapterId] = useState(defaultChapterId ?? "");
  const [chiefGuestId, setChiefGuestId] = useState("");
  const [newChiefGuests, setNewChiefGuests] = useState<{ id: string; name: string; chapterId: string | null }[]>([]);

  // `newChiefGuests` is optimistic (instant UI feedback); `chiefGuests` catches
  // up once the server action's revalidation lands — dedupe so a guest added
  // this way doesn't briefly render twice with the same key.
  const knownIds = new Set(chiefGuests.map((g) => g.id));
  const availableChiefGuests = [...chiefGuests, ...newChiefGuests.filter((g) => !knownIds.has(g.id))].filter(
    (g) => !chapterId || g.chapterId === null || g.chapterId === chapterId,
  );

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
      <div className="flex flex-wrap items-start gap-4 sm:col-span-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Chief Guest
          <select
            name="chiefGuestId"
            value={chiefGuestId}
            onChange={(e) => setChiefGuestId(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none sm:max-w-sm"
          >
            <option value="">None</option>
            {availableChiefGuests.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {!canManageChiefGuests && chapterId && availableChiefGuests.length === 0 ? (
            <span className="text-xs font-normal text-neutral-500">No Chief Guests for this chapter yet.</span>
          ) : null}
        </label>
        {canManageChiefGuests ? (
          <div className="pt-6">
            <QuickAddChiefGuestForm
              chapters={chapters}
              defaultChapterId={chapterId}
              onCreated={(guest) => {
                setNewChiefGuests((prev) => [...prev, { ...guest, chapterId: null }]);
                setChiefGuestId(guest.id);
              }}
            />
          </div>
        ) : null}
      </div>
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
