"use client";

import { useActionState, useState } from "react";
import { submitApplication } from "@/app/(public)/apply/actions";
import type { ChapterAvailability } from "@/lib/applications/availability";

const initialState: { error?: string; success?: boolean } = {};

type Category = { id: string; name: string };

export function ApplyWizard({
  categories,
  availabilityByCategory,
}: {
  categories: Category[];
  availabilityByCategory: Record<string, ChapterAvailability[]>;
}) {
  const [state, formAction, pending] = useActionState(submitApplication, initialState);
  const [categoryId, setCategoryId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">
          Thank you — your application has been received. BWF will be in touch shortly.
        </p>
      </div>
    );
  }

  const availability = categoryId ? availabilityByCategory[categoryId] ?? [] : [];
  const availableChapters = availability.filter((c) => c.available);
  const showForm = Boolean(categoryId) && (chapterId !== null || joiningWaitlist);

  return (
    <div className="flex flex-col gap-10">
      {/* Step 1 */}
      <div>
        <p className="text-sm font-medium text-gold-500">Step 1 — Category</p>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setChapterId(null);
            setJoiningWaitlist(false);
          }}
          className="mt-3 w-full rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        >
          <option value="">Select your business category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2 — availability */}
      {categoryId ? (
        <div>
          <p className="text-sm font-medium text-gold-500">Step 2 — Chapter availability</p>
          <div className="mt-3 flex flex-col gap-2">
            {availability.map((c) => (
              <button
                key={c.chapterId}
                type="button"
                disabled={!c.available}
                onClick={() => {
                  setChapterId(c.chapterId);
                  setJoiningWaitlist(false);
                }}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  chapterId === c.chapterId
                    ? "border-gold-500 text-gold-300"
                    : c.available
                      ? "border-navy-600 text-ivory-100 hover:border-gold-500/50"
                      : "cursor-not-allowed border-navy-700 text-slate-600"
                }`}
              >
                <span>
                  {c.chapterName} {c.location ? `· ${c.location}` : ""}
                </span>
                <span>{c.available ? "Available" : "Occupied"}</span>
              </button>
            ))}
          </div>

          {availableChapters.length === 0 ? (
            <div className="mt-4 rounded-md border border-navy-600 p-4">
              <p className="text-sm text-slate-300">
                Currently unavailable in existing chapters — every active chapter already has a
                member in this category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setJoiningWaitlist(true);
                  setChapterId(null);
                }}
                className="mt-3 rounded-full bg-gold-500 px-5 py-2 text-sm font-medium text-navy-950 hover:bg-gold-400"
              >
                Join the waiting list
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Step 3/4 — application form */}
      {showForm ? (
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-sm font-medium text-gold-500">
            Step 3 — {joiningWaitlist ? "Waiting list" : "Your details"}
          </p>
          <input type="hidden" name="categoryId" value={categoryId} />
          {chapterId ? <input type="hidden" name="chapterId" value={chapterId} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Name
              <input name="name" required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Phone
              <input name="phone" required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
              Email
              <input name="email" type="email" required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Company
              <input name="companyName" required className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Designation
              <input name="designation" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Years in business
              <input name="yearsInBusiness" type="number" min="0" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              How did you hear about BWF?
              <input name="referralSource" className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
              Short company information
              <textarea name="companyInfo" rows={3} className="rounded-md border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-400">
            <input type="checkbox" name="consent" className="mt-1 h-4 w-4" />
            I agree to be contacted by BWF about my application.
          </label>

          {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
