"use client";

import { useState, useTransition } from "react";
import { syncRazorpayPaymentsAction } from "@/app/admin/(dashboard)/payments/invoice-actions";

/** Pulls any Razorpay payment the website hasn't recorded yet (also runs automatically every 10 minutes). */
export function RazorpaySyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-sm">
      <div className="max-w-2xl text-sm">
        <p className="font-semibold text-neutral-900">Online payments missing here?</p>
        <p className="mt-0.5 text-neutral-700">
          Checks Razorpay and records any member payment that was captured but isn&apos;t listed. This also runs by itself every 10 minutes.
        </p>
        {result ? <p className={result.ok ? "mt-1 text-emerald-700" : "mt-1 text-red-700"}>{result.message}</p> : null}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await syncRazorpayPaymentsAction()))}
        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Syncing…" : "Sync with Razorpay"}
      </button>
    </div>
  );
}
