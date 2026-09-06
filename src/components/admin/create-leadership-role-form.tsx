"use client";

import { useActionState } from "react";
import { createLeadershipRole } from "@/app/admin/(dashboard)/leadership-roles/actions";

const initialState: { error?: string } = {};

export function CreateLeadershipRoleForm() {
  const [state, formAction, pending] = useActionState(createLeadershipRole, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-[1fr_auto]">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role name
        <input
          name="label"
          required
          placeholder="e.g. Treasurer"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="self-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add role"}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
    </form>
  );
}
