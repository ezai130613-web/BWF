"use client";

import { useState } from "react";

type Bubble = { heading: string; text: string };

export function InteractiveBubbles({ bubbles }: { bubbles: Bubble[] }) {
  const [active, setActive] = useState(0);
  const current = bubbles[active];
  if (!current) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {bubbles.map((bubble, i) => (
          <button
            key={bubble.heading}
            type="button"
            onClick={() => setActive(i)}
            className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border p-4 text-center text-sm font-medium transition-all sm:h-36 sm:w-36 ${
              active === i
                ? "border-gold-500 bg-emerald-800 text-gold-300 scale-105"
                : "border-emerald-700 text-ivory-100 hover:border-gold-500/50 hover:-translate-y-1"
            }`}
          >
            {bubble.heading}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-sm border border-emerald-700 bg-emerald-800/40 p-6 sm:p-8">
        <p className="font-display text-xl text-ivory-100">{current.heading}</p>
        <div className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-slate-300">
          {current.text.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
