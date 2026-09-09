"use client";

import { trackEvent } from "@/lib/analytics";

type Option = { slug: string; name: string };

/**
 * Brief §50 lists "Category searches" and "Member searches" as separate
 * tracked events, but this is one form that can carry a keyword, a chapter,
 * and a category all in the same submit — firing two events off one submit
 * for a brief that only describes two search *kinds*, not two simultaneous
 * events, would just double-count. One "member_directory_search" event with
 * both fields as params covers what an analyst actually needs (was this a
 * keyword search? a category filter? both?) without the double-count.
 *
 * Stays a plain GET form (`action="/members"`) so it still works with no
 * JS — onSubmit only adds a tracking call on top, it never intercepts or
 * blocks the native submission.
 */
export function MemberSearchForm({
  chapters,
  categories,
  defaultQuery,
  defaultChapterSlug,
  defaultCategorySlug,
}: {
  chapters: Option[];
  categories: Option[];
  defaultQuery?: string;
  defaultChapterSlug?: string;
  defaultCategorySlug?: string;
}) {
  return (
    <form
      className="mt-10 grid gap-4 sm:flex sm:flex-wrap"
      action="/members"
      onSubmit={(e) => {
        const form = e.currentTarget;
        trackEvent("member_directory_search", {
          q: (form.elements.namedItem("q") as HTMLInputElement)?.value || undefined,
          chapter: (form.elements.namedItem("chapter") as HTMLSelectElement)?.value || undefined,
          category: (form.elements.namedItem("category") as HTMLSelectElement)?.value || undefined,
        });
      }}
    >
      <input
        type="text"
        name="q"
        aria-label="Search by name, company, or service"
        defaultValue={defaultQuery}
        placeholder="Search by name, company, or service…"
        className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-4 py-2.5 text-sm text-ivory-100 placeholder:text-slate-500 focus:border-gold-500 focus:outline-none sm:min-w-[240px] sm:flex-1"
      />
      <select
        name="chapter"
        aria-label="Filter by chapter"
        defaultValue={defaultChapterSlug ?? ""}
        className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-4 py-2.5 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none sm:w-auto"
      >
        <option value="">All chapters</option>
        {chapters.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        name="category"
        aria-label="Filter by category"
        defaultValue={defaultCategorySlug ?? ""}
        className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-4 py-2.5 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none sm:w-auto"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 sm:w-auto"
      >
        Search
      </button>
    </form>
  );
}
