"use client";

import { useEffect, useRef, useState } from "react";

const COUNT_UP_MS = 1500;

export function BusinessGeneratedCounter({ crores, updatedAsOf }: { crores: number; updatedAsOf: string | null }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min(1, (now - start) / COUNT_UP_MS);
          setDisplayValue(crores * progress);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [crores]);

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold-500">
        Business Generated Through BWF
      </p>
      <p ref={ref} className="mt-4 font-display text-6xl text-ivory-100 sm:text-7xl lg:text-8xl">
        ₹{displayValue.toFixed(2)}+ Crores
      </p>
      <p className="mt-4 text-slate-400">Business generated between BWF members to date</p>
      <p className="mt-1 text-sm text-slate-500">Connections that translate into measurable business.</p>
      {updatedAsOf ? <p className="mt-3 text-xs text-slate-600">Updated as of {updatedAsOf}</p> : null}
    </div>
  );
}
