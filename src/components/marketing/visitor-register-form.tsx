"use client";

import { useActionState } from "react";
import { registerVisitor } from "@/app/(public)/visit/actions";

const initialState: { error?: string; success?: boolean } = {};

type Option = { id: string; name: string };

export function VisitorRegisterForm({
  categories,
  chapters,
  members,
  meetingId,
  eventId,
  fixedChapter,
}: {
  categories: Option[];
  chapters?: Option[];
  members: Option[];
  meetingId?: string;
  eventId?: string;
  fixedChapter?: Option;
}) {
  const [state, formAction, pending] = useActionState(registerVisitor, initialState);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">Thank you — we&rsquo;ve received your registration. See you there!</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {meetingId ? <input type="hidden" name="meetingId" value={meetingId} /> : null}
      {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
      {fixedChapter ? <input type="hidden" name="chapterId" value={fixedChapter.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Name
          <input
            name="name"
            required
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Phone
          <input
            name="phone"
            required
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Company (optional)
          <input
            name="company"
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Business category
          <select
            name="categoryId"
            required
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {fixedChapter ? (
          <div className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Chapter
            <p className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100">
              {fixedChapter.name}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Chapter
            <select
              name="chapterId"
              required
              className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="">Select…</option>
              {chapters?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Referred by a member? (optional)
          <select
            name="referringMemberId"
            className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">None</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Registering…" : "Register to visit"}
      </button>
    </form>
  );
}
