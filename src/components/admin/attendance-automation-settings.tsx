"use client";

import { useTransition } from "react";
import { setAbsenceTracking } from "@/app/admin/(dashboard)/settings/actions";

/** Phase 38/39 — absence tracking switch and WhatsApp status, on Admin → Settings. */
export function AttendanceAutomationSettings({
  trackingFrom,
  whatsApp,
  templates,
}: {
  /** Formatted IST date-time, or null when off. */
  trackingFrom: string | null;
  whatsApp: "meta" | "console" | "off";
  templates: { name: string; body: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const on = trackingFrom !== null;

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold text-neutral-900">Automatic absence tracking</h2>
            <p className="mt-1 text-sm text-neutral-600">
              After each meeting, members who didn&rsquo;t check in with the QR code are marked Absent. 2 in a row sends
              them a warning (email + WhatsApp); 3 in a row goes to Attendance → Absence Reviews for a decision.
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              {on ? `On — counting meetings from ${trackingFrom} IST.` : "Off — nothing is marked or sent automatically."}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const message = on
                ? "Switch off automatic absence tracking? No meetings will be auto-closed and no warnings sent until it's switched back on."
                : "Switch on automatic absence tracking? Counting starts from now — earlier absences are never counted.";
              if (!confirm(message)) return;
              startTransition(() => setAbsenceTracking(!on));
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50 ${
              on ? "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400" : "bg-emerald-800 text-white hover:bg-emerald-700"
            }`}
          >
            {pending ? "Saving…" : on ? "Switch off" : "Switch on"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold text-neutral-900">WhatsApp messages</h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {whatsApp === "meta"
            ? "Connected to the WhatsApp Business (Cloud) API — meeting reminders and absence warnings go out on WhatsApp as well as email."
            : whatsApp === "console"
              ? "Development mode — WhatsApp messages are written to the server log, not sent."
              : "Not connected yet — reminders and warnings go by email only. To switch it on, BWF needs a verified Meta Business account with a WhatsApp Business number, these two message templates approved in WhatsApp Manager (category: Utility, language: English), and the access token + phone number ID added to the server settings."}
        </p>
        {whatsApp !== "meta" ? (
          <ul className="mt-4 flex flex-col gap-3">
            {templates.map((t) => (
              <li key={t.name} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="font-mono text-xs font-semibold text-neutral-900">{t.name}</p>
                <p className="mt-1 text-sm text-neutral-700">{t.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
