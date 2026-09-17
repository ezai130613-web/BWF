"use client";

/** Spec: "Print" control on the QR Code Generation page — the caller scopes
 * what actually prints via a `#qr-print-area { }` @media print rule; this
 * just triggers the browser's own print dialog on the current page. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
    >
      Print
    </button>
  );
}
