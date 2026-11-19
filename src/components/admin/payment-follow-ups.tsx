"use client";

import { useActionState, useRef, useTransition } from "react";
import { addPaymentFollowUp, deletePaymentFollowUp } from "@/app/admin/(dashboard)/accounts/unpaid/actions";

export type FollowUpView = { id: string; feeType: string; note: string; date: string; next: string | null; by: string | null };

const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

export function PaymentFollowUps({ memberId, items, canEdit }: { memberId: string; items: FollowUpView[]; canEdit: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: { error?: string; ok?: boolean } | undefined, fd: FormData) => {
    const r = await addPaymentFollowUp(prev, fd);
    if (r?.ok) formRef.current?.reset();
    return r;
  }, undefined);
  const [removing, startRemove] = useTransition();

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Follow-up remarks</h2>
      <p className="mt-0.5 text-xs text-neutral-500">Add a dated remark each time you follow up. The history stays until the fee is paid.</p>

      {canEdit ? (
        <form ref={formRef} action={action} className="mt-3 grid gap-3 sm:grid-cols-[11rem_1fr_11rem_auto] sm:items-end">
          <input type="hidden" name="memberId" value={memberId} />
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Fee
            <select name="feeType" className={input}>
              <option value="MEMBERSHIP">Annual fee</option>
              <option value="MEETING">Monthly fee</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Remark
            <input name="note" required maxLength={1000} placeholder="e.g. Called — will pay by Friday" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Follow up again on (optional)
            <input type="date" name="nextFollowUpOn" className={input} />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
            {pending ? "Saving…" : "Add remark"}
          </button>
          {state?.error ? <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p> : null}
        </form>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No follow-ups recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100">
          {items.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-4 py-2.5 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="text-neutral-900">{f.note}</span>
                <span className="text-xs text-neutral-500">
                  {f.date} · {f.feeType === "MEMBERSHIP" ? "Annual fee" : "Monthly fee"}
                  {f.by ? ` · ${f.by}` : ""}
                  {f.next ? ` · next follow-up ${f.next}` : ""}
                </span>
              </span>
              {canEdit ? (
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    if (confirm("Remove this remark?")) startRemove(() => deletePaymentFollowUp(f.id));
                  }}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
