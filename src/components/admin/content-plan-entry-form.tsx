"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  createContentPlanEntry,
  deleteContentPlanEntry,
  duplicateContentPlanEntry,
  updateContentPlanEntry,
} from "@/app/admin/(dashboard)/marketing/calendar/actions";
import {
  CALENDAR_PLATFORMS,
  CALENDAR_PLATFORM_LABELS,
  CONTENT_FORMATS,
  CONTENT_FORMAT_LABELS,
  CONTENT_PLAN_STATUSES,
  CONTENT_PLAN_STATUS_LABELS,
  toIstDateTimeInputs,
} from "@/lib/marketing/constants";
import type { CalendarPlatform, ContentFormat, ContentPlanStatus } from "@/generated/prisma/client";

const initialState: { error?: string } = {};
const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export type ContentPlanEntryRow = {
  id: string;
  title: string;
  topic: string | null;
  contentType: ContentFormat;
  platform: CalendarPlatform;
  scheduledFor: Date;
  description: string | null;
  assignedTo: string | null;
  status: ContentPlanStatus;
};

/**
 * Client spec §2's per-date form — title/topic, content type, platform,
 * planned date+time, description, assigned team member, status. Shared
 * between "+ Add Content" (create, pre-filled with the clicked date) and
 * clicking an existing entry (edit, with duplicate/delete alongside).
 */
export function ContentPlanEntryForm({
  entry,
  defaultDate,
  onDone,
}: {
  entry?: ContentPlanEntryRow;
  defaultDate?: string;
  onDone: () => void;
}) {
  const isEdit = Boolean(entry);
  const [state, formAction, pending] = useActionState(isEdit ? updateContentPlanEntry : createContentPlanEntry, initialState);
  const [actionPending, startTransition] = useTransition();

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  const ist = entry ? toIstDateTimeInputs(entry.scheduledFor) : { date: defaultDate ?? "", time: "10:00" };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={entry!.id} /> : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Content title
        <input name="title" required defaultValue={entry?.title ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Topic
        <input name="topic" defaultValue={entry?.topic ?? ""} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Content type
          <select name="contentType" defaultValue={entry?.contentType ?? "REEL"} className={inputClass}>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {CONTENT_FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Platform
          <select name="platform" defaultValue={entry?.platform ?? "INSTAGRAM"} className={inputClass}>
            {CALENDAR_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {CALENDAR_PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Planned date (IST)
          <input name="date" type="date" required defaultValue={ist.date} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Planned time (IST)
          <input name="time" type="time" required defaultValue={ist.time} className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Description / instructions
        <textarea name="description" rows={3} defaultValue={entry?.description ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Assigned team member
        <input name="assignedTo" defaultValue={entry?.assignedTo ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Status
        <select name="status" defaultValue={entry?.status ?? "PLANNED"} className={inputClass}>
          {CONTENT_PLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTENT_PLAN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add to calendar"}
          </button>
          <button type="button" onClick={onDone} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700">
            Cancel
          </button>
        </div>

        {isEdit ? (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={actionPending}
              onClick={() => startTransition(async () => { await duplicateContentPlanEntry(entry!.id); onDone(); })}
              className="text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={actionPending}
              onClick={() => {
                if (!confirm("Delete this calendar entry? This can't be undone.")) return;
                startTransition(async () => { await deleteContentPlanEntry(entry!.id); onDone(); });
              }}
              className="text-sm text-red-600 underline hover:text-red-800 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
