"use client";

import { useEffect, useState } from "react";
import { PhotoSlot } from "@/components/ui/photo-slot";

type Slide = {
  id: string;
  content: string;
  name: string;
  meta: string;
  imageUrl: string | null;
};

const AUTO_ADVANCE_MS = 6000;

export function TestimonialsCarousel({ testimonials }: { testimonials: Slide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % testimonials.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const current = testimonials[index];
  if (!current) return null;

  return (
    <div className="mt-10">
      <div className="min-h-[220px] overflow-hidden rounded-sm border border-emerald-700 sm:flex">
        <PhotoSlot
          src={current.imageUrl}
          alt={current.name}
          brief={`${current.name} — member portrait`}
          className="aspect-[4/5] w-full sm:aspect-auto sm:w-64 sm:flex-shrink-0"
        />
        <div className="p-8 sm:p-10">
          <p className="font-display text-2xl leading-snug text-ivory-100 sm:text-3xl">
            &ldquo;{current.content}&rdquo;
          </p>
          <p className="mt-6 text-ivory-100">{current.name}</p>
          {current.meta ? <p className="text-sm text-slate-400">{current.meta}</p> : null}
        </div>
      </div>

      {testimonials.length > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)}
            aria-label="Previous testimonial"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-700 text-ivory-100 transition-colors hover:border-gold-500/50 hover:text-gold-400"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === index ? "bg-gold-500" : "bg-emerald-700"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % testimonials.length)}
            aria-label="Next testimonial"
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
