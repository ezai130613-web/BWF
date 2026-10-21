"use client";

import { useEffect, useState } from "react";

/**
 * Payment QR, readable and tappable (2026-10-21). The admin-uploaded QR is
 * usually the bank's whole printed standee (logo, caption, QR in the
 * middle), so it's shown large; tapping opens it full-screen. On a phone —
 * where the member can't scan their own screen — "Pay with UPI app" opens
 * GPay/PhonePe/Paytm directly with the UPI ID filled in, and "Download QR"
 * saves it for the app's "scan from gallery".
 */
export function QrPaymentBlock({
  qrCodeUrl,
  upiId,
  payeeName,
  tone = "dark",
}: {
  qrCodeUrl: string;
  upiId?: string | null;
  payeeName?: string | null;
  tone?: "dark" | "light";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId.trim()).replace("%40", "@")}${payeeName ? `&pn=${encodeURIComponent(payeeName)}` : ""}&cu=INR`
    : null;

  const dark = tone === "dark";
  const caption = dark ? "text-slate-400" : "text-neutral-500";
  const secondary = dark
    ? "border border-emerald-600 text-ivory-100 hover:border-gold-500"
    : "border border-neutral-300 text-neutral-700 hover:border-emerald-700";
  const primary = dark ? "bg-gold-500 text-emerald-950 hover:bg-gold-400" : "bg-emerald-800 text-white hover:bg-emerald-700";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 block w-full max-w-xs cursor-zoom-in overflow-hidden rounded-md bg-white p-2 ${dark ? "border border-emerald-600" : "border border-neutral-200"}`}
        aria-label="Enlarge payment QR code"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-managed WebsiteContent URL, not a next/image-managed asset */}
        <img src={qrCodeUrl} alt="Payment QR code" className="h-auto w-full object-contain" />
      </button>
      <p className={`mt-2 text-sm ${caption}`}>Scan the QR code to pay — tap it to enlarge.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {upiLink ? (
          <a href={upiLink} className={`rounded-md px-4 py-2 text-sm font-semibold sm:hidden ${primary}`}>
            Pay with UPI app
          </a>
        ) : null}
        <a href={qrCodeUrl} download target="_blank" rel="noopener noreferrer" className={`rounded-md px-4 py-2 text-sm font-medium ${secondary}`}>
          Download QR
        </a>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payment QR code"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-managed WebsiteContent URL */}
          <img src={qrCodeUrl} alt="Payment QR code" className="max-h-[80vh] w-auto max-w-full rounded-lg bg-white object-contain p-2" />
          <div className="flex flex-wrap justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {upiLink ? (
              <a href={upiLink} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-neutral-900 sm:hidden">
                Pay with UPI app
              </a>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-white/60 px-4 py-2 text-sm font-medium text-white">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
