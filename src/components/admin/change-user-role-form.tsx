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
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
      >
        <option value="CENTRAL_ADMIN">Central Admin</option>
        <option value="CHAPTER_ADMIN">Chapter Admin</option>
        <option value="ACCOUNTS">Accounts Department</option>
        <option value="WEBSITE_ADMIN">Website Admin</option>
        <option value="MEMBERSHIP_ADMIN">Membership Admin</option>
        <option value="MARKETING_ADMIN">Marketing Admin</option>
        <option value="SUPER_ADMIN">Super Admin</option>
      </select>

      {roleKey === "CHAPTER_ADMIN" ? (
        <select
          name="chapterId"
          required
          defaultValue={currentChapterId ?? ""}
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
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
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-700 hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {state?.error ? <p className="w-full text-xs text-red-600">{state.error}</p> : null}
    </form>
  );
}
