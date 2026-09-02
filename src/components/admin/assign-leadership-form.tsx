"use client";

import { useActionState } from "react";
import { assignChapterLeadership } from "@/app/admin/(dashboard)/chapters/actions";

const initialState: { error?: string } = {};

export function AssignLeadershipForm({
  chapterId,
  members,
  roles,
}: {
  chapterId: string;
  members: { id: string; name: string }[];
  roles: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignChapterLeadership, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="chapterId" value={chapterId} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Member
        <select
          name="memberId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select a member…</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role
        <select
          name="roleId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select a role…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
