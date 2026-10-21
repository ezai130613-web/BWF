"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * One shareable member payment link (2026-10-21) — copy, WhatsApp share and
 * a downloadable QR. The link opens the member portal's Payments page on the
 * right tab; signed-out members are sent through login and back.
 */
export function PaymentLinkCard({
  title,
  description,
  url,
  defaultMessage,
  qrFilename,
}: {
  title: string;
  description: string;
  url: string;
  defaultMessage: string;
  qrFilename: string;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: "M" })
      .then((data) => !cancelled && setQr(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  const fullMessage = `${message.trim()}\n\n${url}`;

  async function copy(text: string, what: "link" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800">{url}</code>
        <button
          type="button"
          onClick={() => copy(url, "link")}
          className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Message sent with the link
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(fullMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Share on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => copy(fullMessage, "message")}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400"
        >
          {copied === "message" ? "Copied!" : "Copy message + link"}
        </button>
        {qr ? (
          <a
            href={qr}
            download={qrFilename}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400"
          >
            Download QR
          </a>
        ) : null}
      </div>

      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL
        <img src={qr} alt={`QR code for ${title}`} className="h-40 w-40 rounded-lg border border-neutral-200 bg-white p-1" />
      ) : null}
    </div>
  );
}
