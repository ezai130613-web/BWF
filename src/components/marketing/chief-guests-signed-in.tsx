"use client";

import { useEffect, useState } from "react";

type GuestBubble = {
  id: string;
  name: string;
  company: string | null;
  designation: string | null;
  visitedOn: string | null;
};

/**
 * Signed-in members and admins see every Chief Guest at a glance as small
 * bubbles (no photos); everyone else keeps the public carousel passed in as
 * `children`. The list comes from /api/chief-guests, which returns 401 for
 * signed-out visitors, so the cached page HTML is the same for everyone.
 */
export function ChiefGuestsSignedIn({ children }: { children: React.ReactNode }) {
  const [guests, setGuests] = useState<GuestBubble[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chief-guests")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { guests: GuestBubble[] } | null) => {
        if (!cancelled && body) setGuests(body.guests);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!guests) return <>{children}</>;

  return (
    <div className="mt-10">
      <p className="text-sm text-slate-400">
        {guests.length} Chief {guests.length === 1 ? "Guest" : "Guests"} — full list for signed-in members.
      </p>
      <ul className="mt-5 flex flex-wrap gap-3">
        {guests.map((g) => (
          <li key={g.id} className="rounded-2xl border border-emerald-600 bg-emerald-900 px-4 py-3 text-sm">
            <p className="font-medium text-ivory-100">{g.name}</p>
            {g.designation || g.company ? (
              <p className="text-slate-300">{[g.designation, g.company].filter(Boolean).join(" · ")}</p>
            ) : null}
            {g.visitedOn ? <p className="mt-1 text-xs text-gold-400">Visited BWF on {g.visitedOn}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
