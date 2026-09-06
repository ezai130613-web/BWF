"use client";

import { useActionState, useState } from "react";
import { rejectArticleSubmission } from "@/app/admin/(dashboard)/blogs/actions";

const initialState: { error?: string } = {};

export function RejectArticleForm({ blogId }: { blogId: string }) {
  const [state, formAction, pending] = useActionState(rejectArticleSubmission, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-red-600 hover:text-red-800">
        Reject submission
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="blogId" value={blogId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700">
        Reason (optional, shared with the member)
        <textarea
          name="reviewNotes"
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      {state?.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Rejecting…" : "Confirm reject"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-neutral-500 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
