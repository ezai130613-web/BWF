"use client";

import { useActionState } from "react";
import { createBlog } from "@/app/admin/(dashboard)/blogs/actions";

const initialState: { error?: string } = {};

export function CreateBlogForm({
  categories,
  authors,
}: {
  categories: { id: string; name: string }[];
  authors: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createBlog, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-3">
        Title
        <input
          name="title"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Author
        <select
          name="authorId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select…</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Start draft"}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}
