"use client";

import { useActionState } from "react";
import { updateMemberBirthday } from "@/app/admin/(dashboard)/members/actions";
import { BirthdayFields } from "@/components/birthday-fields";

const initialState: { error?: string; saved?: boolean; values?: { day: string; month: string; year: string } } = {};

/** Phase 37 — shown on the members' Socials page (day + month only). Clear all three to remove it. */
export function MemberBirthdayForm({
  memberId,
  birthDay,
  birthMonth,
  birthYear,
}: {
  memberId: string;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateMemberBirthday, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
      <input type="hidden" name="memberId" value={memberId} />
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Birthday</h2>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          Shown to fellow members on the Socials page in the app and member portal — day and month only,
          never the year. The member can also set it themselves.
        </p>
      </div>
      {/* Keeps the submitted values after an error; the key remounts the selects (defaultValue only applies on mount). */}
      <BirthdayFields
        key={JSON.stringify(state?.values ?? [birthDay, birthMonth, birthYear])}
        day={state?.values?.day ?? birthDay}
        month={state?.values?.month ?? birthMonth}
        year={state?.values?.year ?? birthYear}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
      {state?.saved && !pending ? <p className="w-full text-sm text-emerald-700">Saved.</p> : null}
    </form>
  );
}
