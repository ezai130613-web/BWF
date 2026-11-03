"use client";

import { useActionState, useState } from "react";
import { updateMeetingPackages, type MeetingPackagesState } from "@/app/admin/(dashboard)/content/actions";
import { MEETING_FEE_GST_PERCENT, packageError, plusGst, type MeetingPackage } from "@/lib/payments/fees";

const cell =
  "w-full min-w-0 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-right text-sm text-neutral-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

/**
 * Meeting fee packages (2026-11-03, client): one row per package (2, 6, 12,
 * 24 meetings). The admin sets the fees and the discount; the final fee
 * (fees − discount) is calculated live and is what members see, always as
 * "₹X + GST".
 */
export function MeetingPackagesEditor({ initial }: { initial: MeetingPackage[] }) {
  const [rows, setRows] = useState(() => initial.map((p) => ({ meetings: p.meetings, fee: String(p.fee), discount: String(p.discount) })));
  const [state, formAction, saving] = useActionState(updateMeetingPackages, {} as MeetingPackagesState);

  const set = (meetings: number, field: "fee" | "discount", value: string) =>
    setRows((rs) => rs.map((r) => (r.meetings === meetings ? { ...r, [field]: value } : r)));

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-neutral-700">Meeting fee packages</p>
        <p className="text-xs text-neutral-500">
          Members can pay for meetings only in these four packages. All amounts are before GST — final fees = fees − discount, and{" "}
          {MEETING_FEE_GST_PERCENT}% GST is added on top.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">Package</th>
              <th className="py-2 pr-3 text-right">Fees (₹ + GST)</th>
              <th className="py-2 pr-3 text-right">Discount (₹)</th>
              <th className="py-2 text-right">Final fees</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const fee = Number(r.fee);
              const discount = r.discount === "" ? 0 : Number(r.discount);
              const invalid = packageError({ meetings: r.meetings, fee, discount });
              const final = fee - discount;
              return (
                <tr key={r.meetings} className="border-b border-neutral-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-neutral-900">{r.meetings} meetings</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      name={`fee_${r.meetings}`}
                      required
                      min={1}
                      step="1"
                      value={r.fee}
                      onChange={(e) => set(r.meetings, "fee", e.target.value)}
                      aria-label={`Fees for ${r.meetings} meetings`}
                      className={cell}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      name={`discount_${r.meetings}`}
                      min={0}
                      step="1"
                      value={r.discount}
                      onChange={(e) => set(r.meetings, "discount", e.target.value)}
                      aria-label={`Discount for ${r.meetings} meetings`}
                      className={cell}
                    />
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-neutral-900">
                    {invalid ? <span className="text-xs font-normal text-red-700">Check fees/discount</span> : plusGst(final)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save packages"}
        </button>
        {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
        {state.success && !saving ? <p className="text-sm text-emerald-700">Saved — members see the new prices now.</p> : null}
      </div>
    </form>
  );
}
