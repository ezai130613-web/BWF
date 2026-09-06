"use client";

import { useActionState } from "react";
import { submitArticle } from "@/app/member/(portal)/articles/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string; success?: boolean } = {};

type Category = { id: string; name: string };

export function SubmitArticleForm({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState(submitArticle, initialState);

  if (state?.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
        Your article has been submitted for review. You&rsquo;ll be notified once BWF has a decision.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Title
        <input
          name="title"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Excerpt (optional)
        <textarea
          name="excerpt"
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Content (Markdown)
        <textarea
          name="content"
          rows={12}
          required
          className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Category
        <select
          name="categoryId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <MediaUploadField label="Featured image (optional)" name="featuredImageUrl" kind="image" />

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
