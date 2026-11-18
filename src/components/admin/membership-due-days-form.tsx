"use client";

import { useActionState } from "react";
import { saveMembershipDueDays } from "@/app/admin/(dashboard)/members/membership/actions";

export function MembershipDueDaysForm({ days }: { days: number }) {
  const [state, formAction, pending] = useActionState(saveMembershipDueDays, {} as { error?: string; saved?: boolean });
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className="max-w-md">
        <h2 className="text-sm font-semibold text-neutral-900">When is the annual fee due?</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Days <em>before</em> a member&rsquo;s next year starts. Example: 30 means a member whose year starts on 15 Feb is shown as unpaid from 16 Jan.
          0 means due on the day itself.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Days before
        <input type="number" name="days" min={0} max={365} step={1} defaultValue={days} required className="w-24 rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
      {state?.saved && !pending ? <p className="w-full text-sm text-emerald-700">Saved.</p> : null}
    </form>
  );
}
