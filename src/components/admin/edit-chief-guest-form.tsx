"use client";

import { useActionState } from "react";
import { updateChiefGuest } from "@/app/admin/(dashboard)/chief-guests/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import type { ChiefGuest } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

type Option = { id: string; name: string };

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function EditChiefGuestForm({ guest, chapters }: { guest: ChiefGuest; chapters: Option[] }) {
  const [state, formAction, pending] = useActionState(updateChiefGuest, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <input type="hidden" name="guestId" value={guest.id} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          defaultValue={guest.name}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company / Organisation
        <input
          name="company"
          defaultValue={guest.company ?? ""}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Designation
        <input
          name="designation"
          defaultValue={guest.designation ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chapter visited
        <select
          name="chapterId"
          defaultValue={guest.chapterId ?? ""}
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
        Date visited
        <input
          name="visitedAt"
          type="date"
          defaultValue={toDateInputValue(guest.visitedAt)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Display order
        <input
          name="displayOrder"
          type="number"
          defaultValue={guest.displayOrder ?? ""}
          placeholder="Leave blank to sort by most recent"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="sm:col-span-2">
        <MediaUploadField label="Photograph" name="photoUrl" kind="image" defaultValue={guest.photoUrl} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Short description
        <textarea
          name="description"
          rows={2}
          defaultValue={guest.description ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 sm:col-span-2">
        <input type="checkbox" name="isPublished" defaultChecked={guest.isPublished} className="h-4 w-4" />
        Display on Homepage
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
