"use client";

import { useActionState } from "react";
import { createAuthor } from "@/app/admin/(dashboard)/blogs/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

export function CreateAuthorForm({ members }: { members: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createAuthor, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Linked member (optional — brief §32)
        <select
          name="memberId"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        >
          <option value="">None (BWF Team / guest contributor)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Bio (optional)
        <textarea
          name="bio"
          rows={2}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      </label>
      <div className="sm:col-span-2">
        <MediaUploadField label="Photo (optional)" name="photoUrl" kind="image" />
      </div>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add author"}
        </button>
      </div>
    </form>
  );
}
