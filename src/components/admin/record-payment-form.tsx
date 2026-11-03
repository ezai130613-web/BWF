"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  loadMemberPaymentOptions,
  recordOfflinePayment,
  type MemberPaymentOptions,
  type RecordPaymentState,
} from "@/app/admin/(dashboard)/payments/record/actions";
import { formatDateKey } from "@/lib/payments/dates";
import { formatRupees, packageLabel, plusGst, quoteMeetings, type MeetingPackage } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";

const input =
  "w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";
const label = "flex flex-col gap-1.5 text-sm font-medium text-neutral-700";

const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/**
 * Accounts' offline-payment form (2026-11-03). Choosing a meeting package
 * (2/6/12/24) ticks the member's next that-many unpaid meetings; any date can
 * be swapped by hand, but exactly that many must stay ticked — the meeting fee
 * can only be paid as a package. Prices are shown as "₹X + GST". Dates already
 * paid are shown but can't be ticked.
 */
export function RecordPaymentForm({
  members,
  packages,
  membershipFee,
  membershipTotal,
}: {
  membershipFee: number | null;
  members: { id: string; label: string }[];
  packages: MeetingPackage[];
  membershipTotal: number | null;
}) {
  const [query, setQuery] = useState("");
  const [memberId, setMemberId] = useState("");
  const [options, setOptions] = useState<MemberPaymentOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [type, setType] = useState<"MEETING" | "MEMBERSHIP">("MEETING");
  const [packageSize, setPackageSize] = useState<number>(packages[0].meetings);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [typedAmount, setTypedAmount] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? members.filter((m) => m.label.toLowerCase().includes(q)) : members).slice(0, 80);
  }, [members, query]);

  function autoSelect(opts: MemberPaymentOptions, n: number) {
    setSelected(new Set(opts.nextUnpaid.slice(0, n)));
  }

  function pickMember(id: string) {
    setMemberId(id);
    setOptions(null);
    setLoadError(null);
    setTypedAmount(null);
    if (!id) return;
    startLoading(async () => {
      const result = await loadMemberPaymentOptions(id);
      if ("error" in result) return setLoadError(result.error);
      setOptions(result);
      autoSelect(result, packageSize);
    });
  }

  // After a successful save: fresh key, and reload the member so their new paid dates show.
  const [state, formAction, saving] = useActionState(async (prev: RecordPaymentState, formData: FormData) => {
    const result = await recordOfflinePayment(prev, formData);
    if (result.success) {
      setIdempotencyKey(crypto.randomUUID());
      setTypedAmount(null);
      const id = String(formData.get("memberId") ?? "");
      const fresh = id ? await loadMemberPaymentOptions(id) : null;
      if (fresh && !("error" in fresh)) {
        setOptions(fresh);
        autoSelect(fresh, packageSize);
      }
    }
    return result;
  }, {} as RecordPaymentState);

  const meetingQuote = quoteMeetings(packageSize, packages);
  // The meeting fee is paid only as a package: exactly that many meetings must be ticked.
  const countMismatch = type === "MEETING" && options !== null && selected.size !== packageSize;
  const suggested = type === "MEETING" ? (meetingQuote?.total ?? null) : membershipTotal;
  const amount = typedAmount ?? (suggested ? String(suggested) : "");

  // Default to this year, or next year once this year is paid — never silently to last year.
  const defaultYear = options ? (options.membership[1].status === "APPROVED" ? options.membership[2].year : options.membership[1].year) : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="type" value={type} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={label}>
          Member
          <input type="search" placeholder="Search name, chapter or phone…" value={query} onChange={(e) => setQuery(e.target.value)} className={input} />
          <select size={6} value={memberId} onChange={(e) => pickMember(e.target.value)} className={cn(input, "font-normal")}>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {loading ? <span className="text-xs font-normal text-neutral-500">Loading…</span> : null}
          {loadError ? <span className="text-xs font-normal text-red-600">{loadError}</span> : null}
          {options ? (
            <span className="text-xs font-normal text-neutral-600">
              {options.name} · {options.chapterName}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className={label}>
            Payment for
            <div className="flex gap-2">
              {(
                [
                  ["MEETING", "Meeting fee"],
                  ["MEMBERSHIP", "Annual membership"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setType(value);
                    setTypedAmount(null);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    type === value ? "bg-emerald-800 text-white" : "border border-neutral-300 bg-white text-neutral-700 hover:border-emerald-700",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>
              Paid by
              <select name="method" required defaultValue="" className={input}>
                <option value="" disabled>
                  Select…
                </option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </label>
            <label className={label}>
              Payment date
              <input type="date" name="actualPaymentDate" required defaultValue={todayIst()} className={input} />
            </label>
          </div>
        </div>
      </div>

      {options && type === "MEETING" ? (
        <div className="flex flex-col gap-3">
          <input type="hidden" name="meetingsToPay" value={packageSize} />
          <label className={cn(label, "max-w-xs")}>
            Meeting package
            <select
              value={packageSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPackageSize(n);
                setTypedAmount(null);
                autoSelect(options, n);
              }}
              className={input}
            >
              {packages.map((p) => (
                <option key={p.meetings} value={p.meetings}>
                  {packageLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium text-neutral-700">
              Meetings covered — {selected.size} of {packageSize} ticked
              <span className="ml-2 font-normal text-neutral-500">(auto-ticked from the next unpaid meeting; you can swap dates)</span>
            </p>
            {countMismatch ? (
              <p className="mt-1 text-xs text-red-600">
                Tick exactly {packageSize} meetings — the meeting fee can only be paid as a package of 2, 6, 12 or 24 meetings.
              </p>
            ) : null}
            <div className="mt-2 grid max-h-80 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-3 lg:grid-cols-4">
              {options.days.map((d) => {
                const paid = d.status === "APPROVED";
                return (
                  <label
                    key={d.date}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-sm",
                      paid ? "border-emerald-200 text-emerald-800" : selected.has(d.date) ? "border-emerald-600" : "border-neutral-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="meetingDate"
                      value={d.date}
                      disabled={paid}
                      checked={paid || selected.has(d.date)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(d.date);
                        else next.delete(d.date);
                        setSelected(next);
                        setTypedAmount(null);
                      }}
                      className="h-4 w-4 accent-emerald-800"
                    />
                    <span>
                      {formatDateKey(d.date)}
                      {paid ? <span className="block text-[11px]">Paid</span> : d.status === "PENDING" ? <span className="block text-[11px] text-amber-700">Awaiting approval</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {options && type === "MEMBERSHIP" ? (
        <label className={cn(label, "max-w-xs")}>
          Membership year
          <select name="membershipYear" key={options.memberId} defaultValue={defaultYear} className={input}>
            {options.membership.map((m) => (
              <option key={m.year} value={m.year} disabled={m.status === "APPROVED"}>
                {m.year}
                {m.status === "APPROVED" ? " — already paid" : m.status === "PENDING" ? " — awaiting approval" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          Amount received (₹, incl. GST)
          <input type="number" name="amountPaidInr" required min={1} step="0.01" value={amount} onChange={(e) => setTypedAmount(e.target.value)} className={input} />
          {type === "MEETING" && meetingQuote ? (
            <span className="text-xs font-normal text-neutral-500">
              Package: {plusGst(meetingQuote.subtotal)} ({formatRupees(meetingQuote.total)} with GST)
            </span>
          ) : type === "MEMBERSHIP" && membershipFee ? (
            <span className="text-xs font-normal text-neutral-500">
              Membership: {plusGst(membershipFee)}
              {membershipTotal ? ` (${formatRupees(membershipTotal)} with GST)` : ""}
            </span>
          ) : null}
        </label>
        <label className={label}>
          Reference (optional)
          <input type="text" name="reference" maxLength={200} placeholder="Receipt no., UTR, cheque no." className={input} />
        </label>
        <label className={label}>
          Remarks (optional, shown to the member)
          <input type="text" name="remarks" maxLength={1000} className={input} />
        </label>
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700">✓ {state.success}</p> : null}

      <button
        type="submit"
        disabled={saving || !options || countMismatch}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
