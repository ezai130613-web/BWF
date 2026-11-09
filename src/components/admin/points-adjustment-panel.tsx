"use client";

import { useActionState, useRef, useTransition } from "react";
import { addPointsAdjustment, deletePointsAdjustment } from "@/app/admin/(dashboard)/app-activity/actions";

type Adjustment = { id: string; points: number; reason: string; date: string };

const inputClass =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

export function PointsAdjustmentPanel({ memberId, adjustments }: { memberId: string; adjustments: Adjustment[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean } | undefined, formData: FormData) => {
      const result = await addPointsAdjustment(prev, formData);
      if (result?.ok) formRef.current?.reset();
      return result;
    },
    undefined,
  );
  const [removing, startRemove] = useTransition();

  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">Adjust points</h2>
      <p className="mt-1 max-w-2xl text-sm text-neutral-600">
        Add or remove points when the system&rsquo;s award needs correcting. The change is added to the
        member&rsquo;s total and shown to them as &ldquo;Admin adjustments&rdquo;. Use a minus sign to remove
        points.
      </p>

      <form
        ref={formRef}
        action={formAction}
        className="mt-3 grid gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:grid-cols-[10rem_1fr_auto] sm:items-end"
      >
        <input type="hidden" name="memberId" value={memberId} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Points (+ or −)
          <input name="points" type="number" step="1" required placeholder="e.g. 10 or -5" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Reason
          <input name="reason" required maxLength={500} placeholder="Why is this being changed?" className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Apply"}
        </button>
        {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}
        {state?.ok ? <p className="text-sm text-emerald-700 sm:col-span-3">Points updated.</p> : null}
      </form>

      {adjustments.length > 0 ? (
        <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          {adjustments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="flex flex-col">
                <span className="text-neutral-900">
                  <strong className={a.points > 0 ? "text-emerald-700" : "text-red-600"}>
                    {a.points > 0 ? `+${a.points}` : a.points}
                  </strong>{" "}
                  · {a.reason}
                </span>
                <span className="text-xs text-neutral-500">{a.date}</span>
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  if (!confirm("Remove this adjustment? The member's total goes back by the same amount.")) return;
                  startRemove(() => deletePointsAdjustment(a.id));
                }}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
