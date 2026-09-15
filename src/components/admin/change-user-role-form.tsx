"use client";

import { useActionState, useState } from "react";
import { changeUserRole } from "@/app/admin/(dashboard)/users/actions";

const initialState: { error?: string } = {};

export function ChangeUserRoleForm({
  userId,
  currentRoleKey,
  currentChapterId,
  chapters,
}: {
  userId: string;
  currentRoleKey: string;
  currentChapterId: string | null;
  chapters: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(changeUserRole, initialState);
  const [roleKey, setRoleKey] = useState(currentRoleKey);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="roleKey"
        value={roleKey}
        onChange={(e) => setRoleKey(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
      >
        <option value="CENTRAL_ADMIN">Central Admin</option>
        <option value="CHAPTER_ADMIN">Chapter Admin</option>
        <option value="SUPER_ADMIN">Super Admin</option>
      </select>

      {roleKey === "CHAPTER_ADMIN" ? (
        <select
          name="chapterId"
          required
          defaultValue={currentChapterId ?? ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select chapter…</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}
            </option>
          ))}
        </select>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {state?.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
