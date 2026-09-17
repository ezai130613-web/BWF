"use client";

import { useActionState } from "react";
import { linkVisitorToMember } from "@/app/admin/(dashboard)/visitors-attendance/profiles/actions";

const initialState: { error?: string; success?: boolean } = {};

/** Spec §5: manual "link this visitor to the member they became" — see the action's own comment for why this is never auto-matched. */
export function LinkVisitorToMemberForm({
  visitorProfileId,
  members,
}: {
  visitorProfileId: string;
  members: { id: string; name: string; chapter: { name: string } }[];
}) {
  const [state, formAction, pending] = useActionState(linkVisitorToMember.bind(null, visitorProfileId), initialState);

  if (state?.success) {
    return <p className="text-sm font-medium text-emerald-700">Linked to member.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Mark as converted to member
        <select name="memberId" required defaultValue="" className="min-w-[14rem] rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="" disabled>
            Select a member…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.chapter.name})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {pending ? "Linking…" : "Link"}
      </button>
      {state?.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
