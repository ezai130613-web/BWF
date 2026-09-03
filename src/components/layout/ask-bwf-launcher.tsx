"use client";

import { useState } from "react";
import { AskBwfWidget } from "@/components/chatbot/ask-bwf-widget";

/**
 * Stacked above the WhatsApp FAB (bottom-6) at bottom-24 so both can coexist
 * — see src/components/layout/whatsapp-cta.tsx for the sibling pattern.
 * Only rendered at all when the parent (public)/layout.tsx confirms the
 * chatbot is enabled + configured — same "no dead entry point ships" rule.
 */
export function AskBwfLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? <AskBwfWidget onClose={() => setOpen(false)} /> : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Ask BWF chat" : "Open Ask BWF chat"}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold-500 text-navy-950 shadow-lg shadow-black/30 transition-transform hover:scale-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
            <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.55 1.24 4.84 3.24 6.44-.1.98-.4 2.4-1.14 3.76a.5.5 0 0 0 .59.72c1.9-.58 3.35-1.42 4.12-1.94.99.27 2.05.42 3.19.42 5.52 0 10-3.94 10-8.8S17.52 2 12 2Z" />
          </svg>
        )}
      </button>
    </>
  );
}
