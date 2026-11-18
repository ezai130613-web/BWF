"use client";

import { useActionState, useState } from "react";
import { updateMemberMembership } from "@/app/admin/(dashboard)/members/actions";
import { formatTerm, termFor, termYearAt } from "@/lib/payments/membership-term";

type PaymentStanding = "APPROVED" | "PENDING";

/**
 * Annual membership runs from the member's joining date (2026-11-18): joined
 * 15 Jan 2024 → terms 15 Jan 2024–14 Jan 2025, 15 Jan 2025–14 Jan 2026… and the
 * next fee is due when a term ends. Payments made before this website existed
 * (the company started in 2024) were never recorded, so Accounts ticks those
 * terms as paid here.
 */
export function MemberMembershipForm({
  memberId,
  joinedKey,
  todayKey,
  paidTerms,
  inSystem,
}: {
  memberId: string;
  /** "YYYY-MM-DD" (IST). */
  joinedKey: string;
  todayKey: string;
  paidTerms: number[];
  /** Standing of each term (by start year) from payments recorded in this system. */
  inSystem: Record<number, PaymentStanding>;
}) {
  const [state, formAction, pending] = useActionState(updateMemberMembership, {} as { error?: string; saved?: boolean });
  const [joined, setJoined] = useState(joinedKey);
  const [checked, setChecked] = useState(() => new Set(paidTerms));

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(joined) && !Number.isNaN(new Date(joined).getTime());
  const firstYear = valid ? Number(joined.slice(0, 4)) : null;
  const currentYear = valid ? termYearAt(joined, todayKey > joined ? todayKey : joined) : null;
  const terms =
    valid && firstYear !== null && currentYear !== null
      ? Array.from({ length: Math.max(0, currentYear - firstYear + 1) }, (_, i) => termFor(joined, firstYear + i))
      : [];

  return (
    <form action={formAction} className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <input type="hidden" name="memberId" value={memberId} />
      <h2 className="text-sm font-semibold text-neutral-900">Annual membership</h2>
      <p className="mt-1 max-w-2xl text-xs text-neutral-500">
        The membership year starts on the joining date (joined 15 Jan 2024 → 15 Jan 2024 to 14 Jan 2025, then the next fee is due).
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        Many members at once? Use <a href="/admin/members/membership" className="underline hover:text-emerald-800">Joining Dates &amp; Paid Years</a> in the menu.
      </p>

      <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm font-medium text-neutral-800">
        Joining date
        <input
          type="date"
          name="joinedAt"
          required
          value={joined}
          max={todayKey}
          onChange={(e) => setJoined(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      {terms.length > 0 ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-neutral-800">Years already paid</legend>
          <p className="mt-0.5 text-xs text-neutral-500">Tick years paid before this website was used. Leave a year unticked if it is still due.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {terms.map((t) => {
              const sys = inSystem[t.year];
              const isCurrent = t.year === currentYear;
              return (
                <li key={t.year}>
                  <label className="flex items-center gap-2 text-sm text-neutral-800">
                    <input
                      type="checkbox"
                      name="paidTerm"
                      value={t.year}
                      checked={checked.has(t.year) || sys === "APPROVED"}
                      disabled={sys === "APPROVED"}
                      onChange={(e) =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(t.year);
                          else next.delete(t.year);
                          return next;
                        })
                      }
                      className="h-4 w-4 accent-emerald-800"
                    />
                    <span>
                      {formatTerm(t)}
                      {isCurrent ? <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">current term</span> : null}
                      {sys === "APPROVED" ? <span className="ml-2 text-[11px] text-emerald-700">Paid on the website</span> : null}
                      {sys === "PENDING" ? <span className="ml-2 text-[11px] text-amber-700">Payment awaiting approval</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <p className="mt-3 text-xs text-neutral-500">Note: the joining date also decides which past meetings count for attendance.</p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !valid}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.saved && !pending ? <p className="text-sm text-emerald-700">Saved.</p> : null}
      </div>
    </form>
  );
}
