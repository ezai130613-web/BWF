"use client";

import { useActionState } from "react";
import { updateChapter } from "@/app/admin/(dashboard)/chapters/actions";
import type { Chapter } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

export function EditChapterForm({ chapter }: { chapter: Chapter }) {
  const [state, formAction, pending] = useActionState(updateChapter, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <input type="hidden" name="chapterId" value={chapter.id} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          defaultValue={chapter.name}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Status
        <select
          name="status"
          defaultValue={chapter.status}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="DRAFT">Draft (internal only)</option>
          <option value="ACTIVE">Active (public)</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Location
        <input
          name="location"
          defaultValue={chapter.location ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Meeting schedule
        <input
          name="meetingSchedule"
          placeholder="e.g. First Tuesday, 7:00 PM"
          defaultValue={chapter.meetingSchedule ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <fieldset className="grid gap-4 rounded-md border border-emerald-200 bg-emerald-50/40 p-4 sm:col-span-2 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold text-emerald-900">Recurring meeting schedule</legend>
        <p className="text-xs text-neutral-600 sm:col-span-3">
          Used by &ldquo;Create Next Month&rsquo;s Meetings&rdquo;. The text field above stays what the public site shows.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Meeting day
          <select
            name="meetingWeekday"
            defaultValue={chapter.meetingWeekday ?? ""}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Not set</option>
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Weeks of the month
          <div className="flex flex-wrap gap-3 pt-1.5">
            {["1st", "2nd", "3rd", "4th", "5th"].map((label, i) => (
              <label key={label} className="flex items-center gap-1.5 font-normal">
                <input
                  type="checkbox"
                  name="meetingWeeksOfMonth"
                  value={i + 1}
                  defaultChecked={chapter.meetingWeeksOfMonth.includes(i + 1)}
                  className="h-4 w-4"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Start time (IST)
          <input
            name="meetingTime"
            type="time"
            defaultValue={chapter.meetingTime ?? ""}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Meeting venue (default for new meetings)
        <input
          name="meetingVenue"
          defaultValue={chapter.meetingVenue ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Meeting address
        <input
          name="meetingAddress"
          defaultValue={chapter.meetingAddress ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Google Maps URL
        <input
          name="googleMapsUrl"
          type="url"
          defaultValue={chapter.googleMapsUrl ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={chapter.description ?? ""}
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
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
