"use client";

import { useActionState } from "react";
import { setCheckinWindow } from "@/app/admin/(dashboard)/qr-codes/[meetingId]/actions";

const initialState: { error?: string; success?: boolean } = {};

function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CheckinWindowForm({
  meetingId,
  checkInOpensAt,
  checkInClosesAt,
}: {
  meetingId: string;
  checkInOpensAt: Date | null;
  checkInClosesAt: Date | null;
}) {
  const [state, formAction, pending] = useActionState(setCheckinWindow.bind(null, meetingId), initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Check-in opens at
        <input
          type="datetime-local"
          name="checkInOpensAt"
          defaultValue={toLocalInputValue(checkInOpensAt)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Check-in closes at
        <input
          type="datetime-local"
          name="checkInClosesAt"
          defaultValue={toLocalInputValue(checkInClosesAt)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save window"}
      </button>
    </form>
  );
}
