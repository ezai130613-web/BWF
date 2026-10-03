"use client";

import { useActionState, useState } from "react";
import { submitFeedback } from "@/app/(public)/feedback/actions";

const initialState: { error?: string; success?: boolean } = {};

const fieldClass =
  "rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none";

export function FeedbackForm({
  chapters,
  meetings,
  members,
}: {
  chapters: { id: string; name: string }[];
  meetings: { id: string; chapterId: string; label: string }[];
  members: { id: string; name: string; chapterId: string }[];
}) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  const [chapterId, setChapterId] = useState("");
  const [rating, setRating] = useState(0);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">Thank you — your feedback has been sent to BWF management.</p>
      </div>
    );
  }

  const chapterMeetings = meetings.filter((m) => m.chapterId === chapterId);
  const chapterMembers = members.filter((m) => m.chapterId === chapterId);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Type
        <select name="type" required defaultValue="GENERAL" className={fieldClass}>
          <option value="GENERAL">General</option>
          <option value="MEETING">Meeting</option>
          <option value="EVENT">Event</option>
          <option value="MANAGEMENT">Management</option>
        </select>
      </label>
      {chapters.length > 0 ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Chapter (optional)
          <select name="chapterId" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={fieldClass}>
            <option value="">Not chapter-specific</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {chapterId ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Meeting you attended (optional)
            <select name="meetingId" defaultValue="" className={fieldClass}>
              <option value="">Not about a specific meeting</option>
              {chapterMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Invited by (optional)
            <select name="invitedByMemberId" defaultValue="" className={fieldClass}>
              <option value="">No one / not applicable</option>
              {chapterMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Name (optional)
        <input name="name" autoComplete="name" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Company (optional)
        <input name="company" autoComplete="organization" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Phone (optional)
        <input name="phone" type="tel" autoComplete="tel" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
        Email (optional — only if you&rsquo;d like a response)
        <input name="email" type="email" autoComplete="email" className={fieldClass} />
      </label>
      <fieldset className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
        <legend className="mb-1.5">Rating (optional)</legend>
        <input type="hidden" name="rating" value={rating || ""} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={rating === n}
              onClick={() => setRating(rating === n ? 0 : n)}
              className={`text-2xl leading-none transition-colors ${n <= rating ? "text-gold-400" : "text-emerald-600 hover:text-gold-500"}`}
            >
              ★
            </button>
          ))}
          {rating ? <span className="ml-2 text-xs text-slate-400">{rating}/5</span> : null}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
        Your feedback
        <textarea name="message" rows={5} required className={fieldClass} />
      </label>
      <p className="text-xs text-slate-400 sm:col-span-2">
        Feedback is only visible to BWF&rsquo;s Super Admin and is never published publicly.
      </p>
      {state?.error ? <p className="text-sm text-red-400 sm:col-span-2">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
