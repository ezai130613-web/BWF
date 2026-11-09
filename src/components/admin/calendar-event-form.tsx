"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "@/app/admin/(dashboard)/calendar/actions";

type Result = { error?: string; ok?: boolean } | undefined;
export type EventFormValues = {
  id: string;
  title: string;
  description: string;
  location: string;
  linkUrl: string;
  allDay: boolean;
  /** "YYYY-MM-DDTHH:mm" (IST) */
  startsAt: string;
  endsAt: string;
  chapterId: string;
  isPublished: boolean;
};

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";
const label = "flex flex-col gap-1.5 text-sm font-medium text-neutral-700";

export function CalendarEventForm({ chapters, event }: { chapters: { id: string; name: string }[]; event?: EventFormValues }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [state, formAction, pending] = useActionState(async (prev: Result, formData: FormData): Promise<Result> => {
    const result = event ? await updateCalendarEvent(event.id, prev, formData) : await createCalendarEvent(prev, formData);
    if (result?.ok && !event) {
      formRef.current?.reset();
      setAllDay(false);
    }
    return result;
  }, undefined);
  const [deleting, startDelete] = useTransition();

  // datetime-local ↔ date: keep the IST wall-clock part the admin typed.
  const dateOnly = (v: string) => v.slice(0, 10);
  const startVal = event ? (allDay ? dateOnly(event.startsAt) : event.startsAt) : undefined;
  const endVal = event?.endsAt ? (allDay ? dateOnly(event.endsAt) : event.endsAt) : undefined;
  const type = allDay ? "date" : "datetime-local";

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        Title
        <input name="title" required maxLength={200} defaultValue={event?.title} className={input} placeholder="e.g. BWF Annual Conclave" />
      </label>
      <label className={label}>
        {allDay ? "Start date" : "Starts (IST)"}
        {/* key forces a fresh input when the type flips, so a stale value isn't kept */}
        <input key={`s-${type}`} name="startsAt" type={type} required defaultValue={startVal} className={input} />
      </label>
      <label className={label}>
        {allDay ? "End date (optional, for multi-day)" : "Ends (IST, optional)"}
        <input key={`e-${type}`} name="endsAt" type={type} defaultValue={endVal} className={input} />
      </label>
      <label className={label}>
        Location (optional)
        <input name="location" maxLength={300} defaultValue={event?.location} className={input} />
      </label>
      <label className={label}>
        Chapter
        <select name="chapterId" defaultValue={event?.chapterId ?? ""} className={input}>
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Link (optional — registration or more info)
        <input name="linkUrl" type="url" maxLength={500} defaultValue={event?.linkUrl} placeholder="https://" className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Description (optional)
        <textarea name="description" rows={2} maxLength={2000} defaultValue={event?.description} className={input} />
      </label>

      <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-emerald-800" />
          All-day
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="isPublished" defaultChecked={event?.isPublished ?? true} className="h-4 w-4 accent-emerald-800" />
          Show on the website calendar
        </label>
      </div>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-emerald-700 sm:col-span-2">{event ? "Saved." : "Event added."}</p> : null}

      <div className="flex items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : event ? "Save changes" : "Add to calendar"}
        </button>
        {event ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm("Delete this event? It will be removed from the calendar.")) return;
              startDelete(() => deleteCalendarEvent(event.id));
            }}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
