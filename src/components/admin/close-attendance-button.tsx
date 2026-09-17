"use client";

import { useTransition } from "react";
import { closeAttendance } from "@/app/admin/(dashboard)/attendance/[meetingId]/actions";

/** Spec: "after closure, mark expected members without check-in Absent." Backfills real Attendance rows for the chapter's expected members who never checked in. */
export function CloseAttendanceButton({ meetingId }: { meetingId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Close attendance and mark every expected member who hasn't checked in as Absent?")) return;
        startTransition(() => {
          void closeAttendance(meetingId);
        });
      }}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
    >
      {pending ? "Closing…" : "Close Meeting & Mark Absentees"}
    </button>
  );
}
