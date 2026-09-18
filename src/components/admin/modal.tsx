"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * First real modal/overlay primitive in this admin (docs/ARCHITECTURE.md's
 * design-system note deliberately skipped Radix — every admin surface before
 * this was full-page forms/tables). The Content Calendar's "click a date to
 * open a form" and Script Writing's script editor both genuinely need an
 * overlay rather than a full page nav, so this is a small hand-built one
 * consistent with the "smallest thing that does the job" precedent
 * (Playwright, marked, exceljs/pdfkit) rather than a new dependency.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 sm:pt-16" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
