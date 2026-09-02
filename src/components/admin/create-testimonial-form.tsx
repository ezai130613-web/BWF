"use client";

import { useActionState } from "react";
import { createTestimonialDirect } from "@/app/admin/(dashboard)/testimonials/actions";

const initialState: { error?: string } = {};

export function CreateTestimonialForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTestimonialDirect, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">
        Add testimonial directly (publishes immediately)
      </h2>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input name="name" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Type
        <select name="type" required defaultValue="MEMBER" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
          <option value="MEMBER">Member</option>
          <option value="VISITOR">Visitor</option>
          <option value="CLIENT">Client</option>
          <option value="VIDEO">Video</option>
          <option value="SUCCESS_STORY">Success Story</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company (optional)
        <input name="company" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role (optional)
        <input name="role" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Chapter (optional)
        <select name="chapterId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
          <option value="">None</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Testimonial
        <textarea name="content" rows={3} required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
        <input type="checkbox" name="consent" className="h-4 w-4" />
        Confirmed with the person that this can be displayed publicly
      </label>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {pending ? "Adding…" : "Publish testimonial"}
        </button>
      </div>
    </form>
  );
}
