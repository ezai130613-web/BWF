"use client";

import { useActionState, useState } from "react";
import { recordVisitorPayment, type RecordVisitorPaymentState } from "@/app/admin/(dashboard)/visitors-payment/record/actions";

const input =
  "w-full min-w-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";
const label = "flex flex-col gap-1.5 text-sm font-medium text-neutral-700";
const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const NEW_VISITOR = "__new";

type MeetingOption = { id: string; label: string; visitors: { id: string; label: string }[] };

export function RecordVisitorPaymentForm({ meetings }: { meetings: MeetingOption[] }) {
  const [meetingId, setMeetingId] = useState("");
  const [visitor, setVisitor] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, saving] = useActionState(async (prev: RecordVisitorPaymentState, formData: FormData) => {
    const result = await recordVisitorPayment(prev, formData);
    if (result.success) {
      setIdempotencyKey(crypto.randomUUID());
      setMeetingId("");
      setVisitor("");
    }
    return result;
  }, {});

  const meeting = meetings.find((m) => m.id === meetingId);
  const isNew = visitor === NEW_VISITOR;

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {!isNew && visitor ? <input type="hidden" name="attendanceId" value={visitor} /> : null}

      <label className={label}>
        Meeting
        <select
          name="meetingId"
          required
          value={meetingId}
          onChange={(e) => {
            setMeetingId(e.target.value);
            setVisitor("");
          }}
          className={input}
        >
          <option value="">Select a meeting…</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {meeting ? (
        <label className={label}>
          Visitor
          <select required value={visitor} onChange={(e) => setVisitor(e.target.value)} className={input}>
            <option value="">Select a visitor…</option>
            {meeting.visitors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
            <option value={NEW_VISITOR}>+ Someone not on this list (add new visitor)</option>
          </select>
          {meeting.visitors.length === 0 ? <span className="text-xs font-normal text-neutral-500">No unpaid visitors checked in at this meeting.</span> : null}
        </label>
      ) : null}

      {isNew ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Visitor name
            <input type="text" name="name" required className={input} />
          </label>
          <label className={label}>
            Mobile number
            <input type="tel" name="phone" required className={input} />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          Paid by
          <select name="method" required defaultValue="" className={input}>
            <option value="" disabled>
              Select…
            </option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </label>
        <label className={label}>
          Amount received (₹)
          <input type="number" name="amountInr" required min={1} step="0.01" className={input} />
        </label>
        <label className={label}>
          Payment date
          <input type="date" name="actualPaymentDate" required defaultValue={todayIst()} max={todayIst()} className={input} />
        </label>
        <label className={label}>
          Reference (optional)
          <input type="text" name="reference" maxLength={200} placeholder="Receipt no., UTR, cheque no." className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Remarks (optional)
          <input type="text" name="remarks" maxLength={1000} className={input} />
        </label>
      </div>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-emerald-700">✓ {state.success}</p> : null}

      <button
        type="submit"
        disabled={saving || !meetingId || !visitor}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Record payment"}
      </button>
    </form>
  );
}
