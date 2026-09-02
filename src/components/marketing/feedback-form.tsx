"use client";

import { useActionState } from "react";
import { submitFeedback } from "@/app/(public)/feedback/actions";

const initialState: { error?: string; success?: boolean } = {};

export function FeedbackForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">Thank you — your feedback has been sent to BWF management.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Type
        <select name="type" required defaultValue="GENERAL" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none">
          <option value="GENERAL">General</option>
          <option value="MEETING">Meeting</option>
          <option value="EVENT">Event</option>
          <option value="MANAGEMENT">Management</option>
        </select>
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
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Name (optional)
        <input name="name" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Email (optional — only if you&rsquo;d like a response)
        <input name="email" type="email" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Your feedback
        <textarea name="message" rows={5} required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
      </label>
      <p className="text-xs text-slate-500">
        Feedback is only visible to BWF&rsquo;s Super Admin and is never published publicly.
      </p>
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
