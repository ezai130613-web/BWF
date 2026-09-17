"use client";

import { useActionState, useState } from "react";
import { registerVisitorCheckin } from "@/app/(public)/visitor-checkin/[token]/actions";
import { VisitorPaymentProofField } from "@/components/visitor-checkin/visitor-payment-proof-field";

const initialState: { error?: string; success?: boolean } = {};

const inputClass =
  "w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

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
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-900">You&rsquo;re checked in. Thanks for visiting BWF!</p>
        {madePayment === "yes" ? (
          <p className="mt-2 text-sm text-emerald-700">
            Your payment is pending review — the BWF team will confirm it shortly.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Full Name
        <input type="text" name="name" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Mobile Number
        <input type="tel" name="phone" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input type="email" name="email" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company / Business Name
        <input type="text" name="companyName" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Business Category / Profession
        <input type="text" name="businessCategory" className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Tell us a little about your business / background
        <textarea name="description" rows={3} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
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
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Please tell us more
          <input type="text" name="sourceDetails" required className={inputClass} />
        </label>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-700">Have you made the visitor meeting payment?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="madePayment"
              value="yes"
              checked={madePayment === "yes"}
              onChange={() => setMadePayment("yes")}
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
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
        <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Amount paid (INR)
            <input type="number" name="amountInr" required min={1} step="0.01" className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Actual payment date
            <input type="date" name="actualPaymentDate" required className={inputClass} />
          </label>

          <VisitorPaymentProofField name="proofUrl" />
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      {madePayment === null ? null : (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      )}
    </form>
  );
}
