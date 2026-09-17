"use client";

import { useActionState, useState } from "react";
import { registerVisitorCheckin } from "@/app/(public)/visitor-checkin/[token]/actions";
import { VisitorPaymentProofField } from "@/components/visitor-checkin/visitor-payment-proof-field";

const initialState: { error?: string; success?: boolean } = {};

// Dark-theme input styling, matching every other public form on this site
// (see VisitorRegisterForm) — this page renders inside the public layout's
// dark emerald body background (globals.css), not a light admin/member
// surface, so light-on-dark contrast has to be explicit rather than assumed.
const inputClass =
  "w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-slate-300";

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "INVITED_BY_MEMBER", label: "Invited by a BWF member" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "GOOGLE_SEARCH", label: "Google Search" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "REFERRAL", label: "Friend / personal referral" },
  { value: "OTHER", label: "Other" },
];

export function VisitorCheckinForm({ token, members }: { token: string; members: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(registerVisitorCheckin.bind(null, token), initialState);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [source, setSource] = useState("");
  const [madePayment, setMadePayment] = useState<"yes" | "no" | null>(null);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="font-display text-2xl text-ivory-100">You&rsquo;re checked in. Thanks for visiting BWF!</p>
        {madePayment === "yes" ? (
          <p className="mt-3 text-sm text-slate-400">Your payment is pending review — the BWF team will confirm it shortly.</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <label className={labelClass}>
        Full Name
        <input type="text" name="name" required className={inputClass} />
      </label>

      <label className={labelClass}>
        Mobile Number
        <input type="tel" name="phone" required className={inputClass} />
      </label>

      <label className={labelClass}>
        Email
        <input type="email" name="email" className={inputClass} />
      </label>

      <label className={labelClass}>
        Company / Business Name
        <input type="text" name="companyName" className={inputClass} />
      </label>

      <label className={labelClass}>
        Business Category / Profession
        <input type="text" name="businessCategory" className={inputClass} />
      </label>

      <label className={labelClass}>
        Tell us a little about your business / background
        <textarea name="description" rows={3} className={inputClass} />
      </label>

      <label className={labelClass}>
        How did you hear about this BWF meeting?
        <select name="source" required value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}>
          <option value="" disabled>
            Select…
          </option>
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {source === "INVITED_BY_MEMBER" ? (
        <label className={labelClass}>
          Which member invited you?
          <select name="invitingMemberId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select a member…
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {source === "OTHER" ? (
        <label className={labelClass}>
          Please tell us more
          <input type="text" name="sourceDetails" required className={inputClass} />
        </label>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-slate-300">Have you made the visitor meeting payment?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              name="madePayment"
              value="yes"
              checked={madePayment === "yes"}
              onChange={() => setMadePayment("yes")}
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              name="madePayment"
              value="no"
              checked={madePayment === "no"}
              onChange={() => setMadePayment("no")}
            />
            No
          </label>
        </div>
      </fieldset>

      {madePayment === "yes" ? (
        <div className="flex flex-col gap-4 rounded-md border border-emerald-700 p-4">
          <label className={labelClass}>
            Amount paid (INR)
            <input type="number" name="amountInr" required min={1} step="0.01" className={inputClass} />
          </label>

          <label className={labelClass}>
            Actual payment date
            <input type="date" name="actualPaymentDate" required className={inputClass} />
          </label>

          <VisitorPaymentProofField name="proofUrl" />
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      {madePayment === null ? null : (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full border border-gold-500/60 px-6 py-2.5 text-sm font-medium text-ivory-100 hover:border-gold-400 hover:text-gold-300 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      )}
    </form>
  );
}
