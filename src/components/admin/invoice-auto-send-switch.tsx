import { setInvoiceAutoSend } from "@/app/admin/(dashboard)/payments/invoice-actions";
import { cn } from "@/lib/utils";

/** "Email invoices automatically after Razorpay payments" switch (2026-11-03) — off by default. */
export function InvoiceAutoSendSwitch({ on }: { on: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-sm">
      <div className="max-w-2xl text-sm">
        <p className="font-semibold text-neutral-900">Auto-send invoices for Razorpay payments: {on ? "ON" : "OFF"}</p>
        <p className="mt-0.5 text-neutral-700">
          {on
            ? "The member is emailed their invoice as soon as an online (Razorpay) payment comes in. Cash, bank, UPI and screenshot payments still need \"Send invoice\"."
            : "Invoices go only when you press \"Send invoice\" on an approved payment. Switch on to email them automatically after each Razorpay payment."}
        </p>
      </div>
      <form action={setInvoiceAutoSend.bind(null, !on)}>
        <button
          type="submit"
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium shadow-sm",
            on ? "border border-neutral-300 bg-white text-neutral-700 hover:border-red-400 hover:text-red-700" : "bg-emerald-800 text-white hover:bg-emerald-700",
          )}
        >
          {on ? "Switch off" : "Switch on"}
        </button>
      </form>
    </div>
  );
}
