"use client";

import { useActionState, useState } from "react";
import { deleteRecordedPayment } from "@/app/admin/(dashboard)/payments/delete-actions";

/** "Delete" for a payment Accounts recorded by hand — asks for a reason first. */
export function DeletePaymentButton({ kind, id }: { kind: "member" | "visitor"; id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteRecordedPayment.bind(null, kind, id), {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-red-700 underline hover:text-red-800">
        Delete
      </button>
    );
  }
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-medium text-red-900">
        Why is this being deleted? (required)
        <input type="text" name="reason" required minLength={3} maxLength={300} placeholder="e.g. entered against the wrong member" className="rounded-lg border border-red-300 bg-white px-2 py-1.5 text-sm font-normal text-neutral-900" />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
        {pending ? "Deleting…" : "Delete payment"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-sm text-neutral-600 underline">
        Cancel
      </button>
      {state?.error ? <p className="w-full text-sm text-red-700">{state.error}</p> : null}
      <p className="w-full text-xs text-red-800">This can&rsquo;t be undone. It is recorded in the activity log.</p>
    </form>
  );
}
