"use client";

import { useActionState, useState } from "react";
import { correctAttendance } from "@/app/admin/(dashboard)/attendance/[meetingId]/actions";

const initialState: { error?: string; success?: boolean } = {};

/** Spec: corrections require a mandatory reason — collapsed by default so the table stays scannable. */
export function CorrectAttendanceForm({
  meetingId,
  memberId,
  currentStatus,
}: {
  meetingId: string;
  memberId: string;
  currentStatus: "PRESENT" | "ABSENT" | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(correctAttendance.bind(null, meetingId, memberId), initialState);

  if (state?.success && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-neutral-500 hover:text-neutral-900">
        Corrected — edit again
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-neutral-600 underline hover:text-neutral-900">
        Correct
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <select name="status" defaultValue={currentStatus ?? "PRESENT"} className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
        <option value="PRESENT">Present</option>
        <option value="ABSENT">Absent</option>
      </select>
      <input
        name="reason"
        required
        placeholder="Reason for correction (required)"
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
      />
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
