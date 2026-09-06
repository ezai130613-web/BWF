"use client";

import { useActionState } from "react";
import { convertApplicationToMember } from "@/app/admin/(dashboard)/applications/actions";

const initialState: { error?: string } = {};

export function ConvertApplicationForm({ applicationId, disabled }: { applicationId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(convertApplicationToMember, initialState);

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create member account"}
      </button>
      {state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
