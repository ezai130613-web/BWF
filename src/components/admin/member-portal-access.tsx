"use client";

import { useActionState } from "react";
import { grantMemberPortalAccess, toggleMemberPortalAccess } from "@/app/admin/(dashboard)/members/actions";

const initialState: { error?: string } = {};

export function MemberPortalAccess({
  memberId,
  linkedUser,
}: {
  memberId: string;
  linkedUser: { email: string; status: string } | null;
}) {
  const [state, formAction, pending] = useActionState(grantMemberPortalAccess, initialState);

  if (linkedUser) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-6">
        <div>
          <p className="text-sm font-medium text-neutral-900">Portal login: {linkedUser.email}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Status:{" "}
            <span className={linkedUser.status === "ACTIVE" ? "text-emerald-700" : "text-red-700"}>
              {linkedUser.status}
            </span>
          </p>
        </div>
        <form action={toggleMemberPortalAccess.bind(null, memberId)}>
          <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
            {linkedUser.status === "ACTIVE" ? "Revoke access" : "Restore access"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-3">
      <input type="hidden" name="memberId" value={memberId} />
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-3">
        Grant portal access (brief §12)
      </h2>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Login email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Temporary password
        <input
          name="password"
          type="text"
          required
          minLength={12}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Grant access"}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}
