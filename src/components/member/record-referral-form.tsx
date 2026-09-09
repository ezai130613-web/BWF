"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordReferral } from "@/app/member/(portal)/referrals/actions";

const initialState: { error?: string; success?: boolean } = {};

type Option = { id: string; name: string };

export function RecordReferralForm({ members }: { members: Option[] }) {
  const [state, formAction, pending] = useActionState(recordReferral, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Record a Referral</h2>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Referred to
        <select
          name="toMemberId"
          required
          defaultValue=""
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="" disabled>
            Select a member…
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Type
        <select
          name="type"
          defaultValue="OUTSIDE"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="OUTSIDE">Outside Referral — someone from your network</option>
          <option value="SELF">Self / Inside Referral — you bought from them</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Description (optional)
        <textarea
          name="description"
          rows={2}
          placeholder="Who did you connect them with, or what did you need?"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700 sm:col-span-2">Referral recorded.</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Recording…" : "Record Referral"}
        </button>
      </div>
    </form>
  );
}
