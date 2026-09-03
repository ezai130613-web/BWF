"use client";

import { useActionState } from "react";
import { updateReportSchedule } from "@/app/admin/(dashboard)/reports/actions";

const initialState: { error?: string } = {};

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function ReportScheduleForm({ dayOfWeek, isEnabled }: { dayOfWeek: number; isEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(updateReportSchedule, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Send day
        <select
          name="dayOfWeek"
          defaultValue={dayOfWeek}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="isEnabled" defaultChecked={isEnabled} className="h-4 w-4 rounded border-neutral-300" />
        Enabled
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save schedule"}
      </button>
    </form>
  );
}
