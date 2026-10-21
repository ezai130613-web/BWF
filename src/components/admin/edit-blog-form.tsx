"use client";

import { useActionState, useState } from "react";
import { updateBlog } from "@/app/admin/(dashboard)/blogs/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import type { Blog } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

type FaqEntry = { question: string; answer: string };

function toDatetimeLocal(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function EditBlogForm({
  post,
  categories,
  authors,
  tagNames,
}: {
  post: Blog;
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
  tagNames: string[];
}) {
  const [state, formAction, pending] = useActionState(updateBlog, initialState);
  const [status, setStatus] = useState(post.status);
  const [faqEntries, setFaqEntries] = useState<FaqEntry[]>(
    Array.isArray(post.faq) ? (post.faq as FaqEntry[]) : [],
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="blogId" value={post.id} />
      <input type="hidden" name="faq" value={JSON.stringify(faqEntries)} />

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Title
          <input
            name="title"
            defaultValue={post.title}
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Excerpt
          <textarea
            name="excerpt"
            rows={2}
            defaultValue={post.excerpt ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Content (Markdown)
          <textarea
            name="content"
            rows={16}
            defaultValue={post.content}
            className="rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Category
            <select
              name="categoryId"
              defaultValue={post.categoryId}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Author
            <select
              name="authorId"
              defaultValue={post.authorId}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            >
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Tags (comma-separated)
            <input
              name="tags"
              defaultValue={tagNames.join(", ")}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
        </div>
        <MediaUploadField label="Featured image" name="featuredImageUrl" kind="image" defaultValue={post.featuredImageUrl} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold text-neutral-900">FAQ (brief §29 — AEO/GEO)</h2>
        {faqEntries.map((entry, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              placeholder="Question"
              value={entry.question}
              onChange={(e) => {
                const next = [...faqEntries];
                next[i] = { ...next[i], question: e.target.value };
                setFaqEntries(next);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
            <input
              placeholder="Answer"
              value={entry.answer}
              onChange={(e) => {
                const next = [...faqEntries];
                next[i] = { ...next[i], answer: e.target.value };
                setFaqEntries(next);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
            <button
              type="button"
              onClick={() => setFaqEntries(faqEntries.filter((_, idx) => idx !== i))}
              className="text-sm text-neutral-500 hover:text-emerald-800"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFaqEntries([...faqEntries, { question: "", answer: "" }])}
          className="self-start text-sm text-neutral-500 hover:text-emerald-800"
        >
          + Add FAQ entry
        </button>
      </section>

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">SEO</h2>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          SEO title
          <input
            name="seoTitle"
            defaultValue={post.seoTitle ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Canonical URL
          <input
            name="canonicalUrl"
            defaultValue={post.canonicalUrl ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
          Meta description
          <textarea
            name="metaDescription"
            rows={2}
            defaultValue={post.metaDescription ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          OG title
          <input
            name="ogTitle"
            defaultValue={post.ogTitle ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
        <MediaUploadField label="OG image" name="ogImageUrl" kind="image" defaultValue={post.ogImageUrl} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
          OG description
          <textarea
            name="ogDescription"
            rows={2}
            defaultValue={post.ogDescription ?? ""}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </label>
      </section>

      <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          >
            <option value="DRAFT">Draft</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PUBLISHED">Published</option>
            <option value="UNPUBLISHED">Unpublished</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        {status === "SCHEDULED" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Publish at
            <input
              type="datetime-local"
              name="scheduledAt"
              defaultValue={toDatetimeLocal(post.scheduledAt)}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      </section>
    </form>
  );
}
