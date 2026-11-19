"use client";

import { useActionState, useState } from "react";
import { updateSlipPoints } from "@/app/admin/(dashboard)/app-activity/actions";

const input = "rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

/** "Counts X%" for one Thank You Slip, with an Edit toggle (admins with points_config:manage only). */
export function SlipPointsEditor({ slipId, percent, note }: { slipId: string; percent: number; note: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: { error?: string; ok?: boolean } | undefined, fd: FormData) => {
    const r = await updateSlipPoints(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, undefined);

  if (!open) {
    return (
      <span className="flex items-center gap-2">
        <span className={percent === 100 ? "text-neutral-600" : "font-medium text-amber-700"}>{percent}%</span>
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-emerald-800 underline hover:text-emerald-700">
          Edit
        </button>
      </span>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slipId" value={slipId} />
      <input name="percent" type="number" min={0} max={100} step={1} defaultValue={percent} required className={`${input} w-20`} aria-label="Percent that counts" />
      <span className="text-xs text-neutral-500">% counts</span>
      <input name="note" defaultValue={note ?? ""} maxLength={300} placeholder="Why? e.g. Loan — 1/5" className={`${input} w-52`} />
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 underline">
        Cancel
      </button>
      {state?.error ? <span className="w-full text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
