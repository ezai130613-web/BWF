"use client";

import { useRef } from "react";
import { PhotoSlot } from "@/components/ui/photo-slot";

type Guest = {
  id: string;
  name: string;
  company: string;
  designation: string | null;
  photoUrl: string | null;
};

/**
 * §"ADDITIONAL REQUIREMENT — CHIEF GUESTS": 3-at-a-time desktop / 1-at-a-time
 * mobile, arrows, swipe. Rather than tracking a breakpoint-aware page index
 * in JS, this scrolls the native horizontally-snapping row by exactly one
 * viewport-width of content per arrow click — which IS "next 3" on desktop
 * and "next 1" on mobile, automatically, at every width in between, and
 * comes with real touch-swipe scrolling for free.
 */
export function ChiefGuestsCarousel({ guests }: { guests: Guest[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative mt-10">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4"
      >
        {guests.map((guest) => (
          <div
            key={guest.id}
            className="w-[85vw] flex-shrink-0 snap-start overflow-hidden rounded-sm border border-emerald-700 bg-emerald-900 sm:w-[45vw] lg:w-[calc((100%-3rem)/3)]"
          >
            <PhotoSlot
              src={guest.photoUrl}
              alt={guest.name}
              brief={`${guest.name} — Chief Guest portrait`}
              className="aspect-[4/5]"
            />
            <div className="p-5">
              <p className="font-display text-lg text-ivory-100">{guest.name}</p>
              {guest.designation ? <p className="mt-1 text-sm text-gold-400">{guest.designation}</p> : null}
              <p className="text-sm text-slate-400">{guest.company}</p>
            </div>
          </div>
        ))}
      </div>

      {guests.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Previous Chief Guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700 text-ivory-100 transition-colors hover:border-gold-500/50 hover:text-gold-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Next Chief Guests"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700 text-ivory-100 transition-colors hover:border-gold-500/50 hover:text-gold-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}
