"use client";

import { useActionState } from "react";
import { submitTestimonial } from "@/app/(public)/testimonials/actions";

const initialState: { error?: string; success?: boolean } = {};

export function SubmitTestimonialForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(submitTestimonial, initialState);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">Thank you — your testimonial will appear once reviewed.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="type" value="MEMBER" />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Name
        <input name="name" required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Company (optional)
        <input name="company" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Role (optional)
        <input name="role" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      {chapters.length > 0 ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Chapter (optional)
          <select name="chapterId" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none">
            <option value="">Not chapter-specific</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
        Your experience with BWF
        <textarea name="content" rows={4} required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-400 sm:col-span-2">
        <input type="checkbox" name="consent" className="mt-1 h-4 w-4" />
        I&rsquo;m okay with this being displayed publicly on the BWF website.
      </label>
      {state?.error ? <p className="text-sm text-red-400 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Submit testimonial"}
        </button>
      </div>
    </form>
  );
}
