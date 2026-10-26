"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { checkIn } from "@/app/member/(portal)/checkin/[token]/actions";

const initialState: { error?: string; success?: boolean } = {};

/**
 * One-tap QR check-in. Phase 40 (client, 2026-10-26): payments happen only
 * on the Payments page, so check-in no longer asks about payment — if the
 * month isn't paid, the member gets a link to pay there instead.
 */
export function CheckinForm({ token, monthPaid, monthLabel }: { token: string; monthPaid: boolean; monthLabel: string }) {
  const [state, formAction, pending] = useActionState(checkIn.bind(null, token), initialState);
  // Generated once per form mount — a double-clicked submit is recognised and ignored by the server.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (state?.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-medium text-emerald-900">You&rsquo;re checked in as Present.</p>
        {!monthPaid ? (
          <p className="mt-2 text-sm text-emerald-700">
            Your {monthLabel} meeting fee isn&rsquo;t paid yet —{" "}
            <Link href="/member/payments" className="font-semibold underline">
              pay now
            </Link>
            .
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="madePayment" value="no" />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Checking in…" : "Check In"}
      </button>
    </form>
  );
}
