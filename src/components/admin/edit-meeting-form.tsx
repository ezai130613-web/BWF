"use client";

import { useActionState, useState } from "react";
import { updateMeeting } from "@/app/admin/(dashboard)/meetings/actions";
import { QuickAddChiefGuestForm } from "@/components/admin/quick-add-chief-guest-form";
import type { Meeting } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditMeetingForm({
  meeting,
  chiefGuests,
  canManageChiefGuests,
}: {
  meeting: Meeting;
  chiefGuests: { id: string; name: string }[];
  canManageChiefGuests: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateMeeting, initialState);
  const [chiefGuestId, setChiefGuestId] = useState(meeting.chiefGuestId ?? "");
  const [newChiefGuests, setNewChiefGuests] = useState<{ id: string; name: string }[]>([]);

  // `newChiefGuests` is optimistic (instant UI feedback); `chiefGuests` catches
  // up once the server action's revalidation lands — dedupe so a guest added
  // this way doesn't briefly render twice with the same key.
  const knownIds = new Set(chiefGuests.map((g) => g.id));
  const availableChiefGuests = [...chiefGuests, ...newChiefGuests.filter((g) => !knownIds.has(g.id))];

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <input type="hidden" name="meetingId" value={meeting.id} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Title
        <input
          name="title"
          defaultValue={meeting.title}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Status
        <select
          name="status"
          defaultValue={meeting.status}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Date &amp; time
        <input
          name="startsAt"
          type="datetime-local"
          defaultValue={toLocalInputValue(meeting.startsAt)}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Venue
        <input
          name="venue"
          defaultValue={meeting.venue ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Address
        <input
          name="address"
          defaultValue={meeting.address ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Google Maps URL
        <input
          name="googleMapsUrl"
          type="url"
          defaultValue={meeting.googleMapsUrl ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="flex flex-col gap-2 sm:col-span-2">
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
        </label>
        {!canManageChiefGuests && availableChiefGuests.length === 0 ? (
          <span className="text-xs text-neutral-500">No Chief Guests for this chapter yet.</span>
        ) : null}
        {canManageChiefGuests ? (
          <QuickAddChiefGuestForm
            chapterId={meeting.chapterId}
            onCreated={(guest) => {
              setNewChiefGuests((prev) => [...prev, guest]);
              setChiefGuestId(guest.id);
            }}
          />
        ) : null}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Agenda
        <input
          name="agenda"
          defaultValue={meeting.agenda ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={meeting.description ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 sm:col-span-2">
        <input type="checkbox" name="visitorRegistrationEnabled" defaultChecked={meeting.visitorRegistrationEnabled} className="h-4 w-4" />
        Allow online visitor registration for this meeting
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
