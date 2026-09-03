"use client";

import { useActionState } from "react";
import { createEvent } from "@/app/admin/(dashboard)/events/actions";

const initialState: { error?: string } = {};

const EVENT_TYPES = [
  { value: "SPECIAL_EVENT", label: "Special Event" },
  { value: "CHAPTER_MEETING", label: "Chapter Meeting" },
  { value: "NETWORKING_EVENT", label: "Networking Event" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "EXHIBITION", label: "Exhibition" },
  { value: "CHAPTER_LAUNCH", label: "Chapter Launch" },
] as const;

export function CreateEventForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createEvent, initialState);

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
        Type
        <select
          name="eventType"
          defaultValue="SPECIAL_EVENT"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chapter
        <select
          name="chapterId"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Global (all chapters)</option>
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
        Registration deadline
        <input
          name="registrationDeadline"
          type="datetime-local"
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
        Capacity
        <input
          name="capacity"
          type="number"
          min="1"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Image URL
        <input
          name="imageUrl"
          type="url"
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
          {pending ? "Adding…" : "Add event"}
        </button>
      </div>
    </form>
  );
}
