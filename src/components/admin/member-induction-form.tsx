"use client";

import { useActionState } from "react";
import { updateMemberInduction } from "@/app/admin/(dashboard)/members/actions";

const initialState: { error?: string } = {};

export function MemberInductionForm({
  memberId,
  currentReferredByMemberId,
  candidates,
}: {
  memberId: string;
  currentReferredByMemberId: string | null;
  candidates: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateMemberInduction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-6">
      <input type="hidden" name="memberId" value={memberId} />
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Induction</h2>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          Manually recorded, not auto-matched from visitor registrations — if another member
          invited this member to join, select who. They get the induction credit.
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Referred by
        <select
          name="referredByMemberId"
          defaultValue={currentReferredByMemberId ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">No inductor recorded</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
