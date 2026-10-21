"use client";

import { useActionState } from "react";
import { createRosterRole } from "@/app/admin/(dashboard)/roster-roles/actions";

const initialState: { error?: string } = {};

export function CreateRosterRoleForm() {
  const [state, formAction, pending] = useActionState(createRosterRole, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-[1fr_auto]">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role name
        <input
          name="label"
          required
          placeholder="e.g. Ranking Coordinator"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <div className="self-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add role"}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
    </form>
  );
}
