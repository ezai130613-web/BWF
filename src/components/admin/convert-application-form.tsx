"use client";

import { useActionState } from "react";
import { convertApplicationToMember } from "@/app/admin/(dashboard)/applications/actions";

const initialState: { error?: string } = {};

export function ConvertApplicationForm({ applicationId, disabled }: { applicationId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(convertApplicationToMember, initialState);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="mb-3 flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Approval remarks (optional, admin-only)
        <textarea
          name="remarks"
          rows={2}
          maxLength={2000}
          placeholder="Saved to the member's record"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create member account"}
      </button>
      {state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
