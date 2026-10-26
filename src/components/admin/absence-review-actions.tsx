"use client";

import { useActionState, useState } from "react";
import { decideReview, type DecideState } from "@/app/admin/(dashboard)/attendance/reviews/actions";

const inputClass =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

/**
 * Phase 39 — "Extend courtesy" or "Remove member" for one open absence
 * review. After a decision the action redirects back to the reviews page,
 * which shows the confirmation.
 */
export function AbsenceReviewActions({ reviewId, memberName, today }: { reviewId: string; memberName: string; today: string }) {
  const [state, formAction, pending] = useActionState<DecideState | undefined, FormData>(decideReview, undefined);
  const [kind, setKind] = useState<"courtesy" | "remove" | null>(null);

  if (!kind) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind("courtesy")}
          className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Extend courtesy
        </button>
        <button
          type="button"
          onClick={() => setKind("remove")}
          className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Remove member
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (kind === "remove" && !confirm(`Remove ${memberName}? They'll be deactivated, signed out of the app and website, and hidden everywhere. Their records are kept and an admin can restore them later from Members.`)) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-semibold text-neutral-900">{kind === "courtesy" ? "Extend courtesy (e.g. medical approval)" : "Remove member"}</p>
      {kind === "courtesy" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Excuse absences up to
          <input type="date" name="excusedUntil" defaultValue={today} className={`${inputClass} w-48`} />
          <span className="text-xs font-normal text-neutral-500">
            Meetings up to this date won&rsquo;t count. Pick a later date for ongoing leave (e.g. recovery after surgery).
          </span>
        </label>
      ) : (
        <p className="text-xs text-neutral-600">
          Deactivates the member: login suspended and signed out everywhere, hidden from the website, app, rosters and
          reminders; their category slot opens up. Payments, attendance and activity records are kept.
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        {kind === "courtesy" ? "Note (required)" : "Reason (required)"}
        <textarea name="note" required rows={2} maxLength={1000} className={inputClass} placeholder={kind === "courtesy" ? "e.g. Medical certificate received — hospitalised" : "e.g. No response after warning"} />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 ${kind === "remove" ? "bg-red-700 hover:bg-red-600" : "bg-emerald-800 hover:bg-emerald-700"}`}
        >
          {pending ? "Saving…" : kind === "remove" ? "Remove member" : "Extend courtesy"}
        </button>
        <button type="button" onClick={() => setKind(null)} className="rounded-lg px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
