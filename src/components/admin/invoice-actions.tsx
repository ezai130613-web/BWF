"use client";

import { useState, useTransition } from "react";
import { sendInvoiceAction } from "@/app/admin/(dashboard)/payments/invoice-actions";

type Props = {
  paymentId: string;
  /** Existing invoice, if one was already made for this payment. */
  invoice: { number: string; sentAt: Date | null; sentTo: string | null; lastSentBy: string | null } | null;
};

const istDate = (d: Date) => new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

/** Approved member payments: one-click "Send invoice" (emails the PDF) and "Download invoice". */
export function InvoiceActions({ paymentId, invoice }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const sent = invoice?.sentAt;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await sendInvoiceAction(paymentId)))}
        className="rounded-lg bg-emerald-800 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : sent ? "Resend invoice" : "Send invoice"}
      </button>
      <a href={`/api/admin/invoices/${paymentId}`} target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-emerald-800">
        {invoice ? `Invoice ${invoice.number}` : "Preview invoice"}
      </a>
      {result ? (
        <span className={result.ok ? "text-emerald-700" : "text-red-700"}>{result.message}</span>
      ) : sent ? (
        <span className="text-neutral-500">
          Sent {istDate(sent)}
          {invoice?.sentTo ? ` to ${invoice.sentTo}` : ""}
          {invoice?.lastSentBy === "AUTO" ? " (automatic)" : ""}
        </span>
      ) : null}
    </div>
  );
}
