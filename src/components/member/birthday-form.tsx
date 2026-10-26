"use client";

import { useActionState } from "react";
import { Cake } from "lucide-react";
import { updateOwnBirthday } from "@/app/member/(portal)/profile/actions";
import { BirthdayFields } from "@/components/birthday-fields";
import { Card, FormStatus } from "@/components/member/ui";

const initialState: { error?: string; success?: boolean; values?: { day: string; month: string; year: string } } = {};

/** Phase 37 — saved straight away (no review); fellow members see day + month on Socials. */
export function BirthdayForm({ day, month, year }: { day: number | null; month: number | null; year: number | null }) {
  const [state, formAction, pending] = useActionState(updateOwnBirthday, initialState);

  return (
    <div id="birthday">
      <Card title="Birthday" icon={Cake} description="Fellow members see the day and month on Socials, never the year. Saved straight away — no review needed.">
        <form action={formAction} className="flex flex-col gap-4">
          {/* On an error, keep what the member typed rather than snapping back to the saved value. A <select>'s
              defaultValue only applies on mount, so the key remounts the fields whenever their defaults change. */}
          <BirthdayFields
            key={JSON.stringify(state?.values ?? [day, month, year])}
            day={state?.values?.day ?? day}
            month={state?.values?.month ?? month}
            year={state?.values?.year ?? year}
          />
          <FormStatus error={state?.error} success={state?.success && !pending ? "Birthday saved." : null} />
          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save birthday"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
