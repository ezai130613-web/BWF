"use client";

import { useActionState, useState } from "react";
import { createAdminUser } from "@/app/admin/(dashboard)/users/actions";

const initialState: { error?: string } = {};

export function CreateUserForm({ chapters }: { chapters: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createAdminUser, initialState);
  const [roleKey, setRoleKey] = useState("CENTRAL_ADMIN");

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Temporary password
        <input
          name="password"
          type="text"
          required
          minLength={12}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role
        <select
          name="roleKey"
          required
          value={roleKey}
          onChange={(e) => setRoleKey(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="CENTRAL_ADMIN">Central Admin</option>
          <option value="CHAPTER_ADMIN">Chapter Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </label>

      {roleKey === "CHAPTER_ADMIN" ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Chapter
          <select
            name="chapterId"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Select…</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create admin user"}
        </button>
      </div>
    </form>
  );
}
