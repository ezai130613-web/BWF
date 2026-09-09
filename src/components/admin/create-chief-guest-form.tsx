"use client";

import { useActionState } from "react";
import { createChiefGuest } from "@/app/admin/(dashboard)/chief-guests/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

type Option = { id: string; name: string };

export function CreateChiefGuestForm({ chapters }: { chapters: Option[] }) {
  const [state, formAction, pending] = useActionState(createChiefGuest, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Add a Chief Guest</h2>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company / Organisation
        <input
          name="company"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Designation (optional)
        <input
          name="designation"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chapter visited (optional)
        <select
          name="chapterId"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">None</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Date visited (optional)
        <input
          name="visitedAt"
          type="date"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Display order (optional)
        <input
          name="displayOrder"
          type="number"
          placeholder="Leave blank to sort by most recent"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="sm:col-span-2">
        <MediaUploadField label="Photograph (shows on the homepage carousel once added)" name="photoUrl" kind="image" />
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Short description (optional)
        <textarea
          name="description"
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add Chief Guest"}
        </button>
      </div>
    </form>
  );
}
