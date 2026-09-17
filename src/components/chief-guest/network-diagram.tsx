/**
 * Hub-and-spoke visual reused by the Hero ("CHIEF GUEST" ↔ professional categories) and the
 * Builder's Advantage section ("YOUR NEXT PROJECT" ↔ construction value chain) — same
 * mechanism, different content. Pure CSS/SVG, no client JS: node positions are computed with
 * simple trig at render time and placed via percentage `left`/`top`, with one SVG line per
 * node drawn behind them at the matching percentage coordinates.
 */
export function NetworkDiagram({ center, nodes }: { center: string; nodes: string[] }) {
  const compact = nodes.length > 6;
  const radius = compact ? 40 : 38;
  const nodeDiameter = compact ? 22 : 28;

  const points = nodes.map((label, i) => {
    const angle = (360 / nodes.length) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      label,
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad),
    };
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative hidden aspect-square sm:block">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {points.map((point) => (
            <line
              key={point.label}
              x1={50}
              y1={50}
              x2={point.x}
              y2={point.y}
              className="stroke-gold-500/40"
              strokeWidth={0.4}
            />
          ))}
        </svg>

        <div
          className="absolute flex aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-gold-500 bg-emerald-700 p-3 text-center"
          style={{ left: "50%", top: "50%" }}
        >
          <span className="font-display text-sm leading-tight text-gold-300 sm:text-base">{center}</span>
        </div>

        {points.map((point) => (
          <div
            key={point.label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-emerald-600 bg-emerald-900 p-2 text-center transition-transform hover:-translate-y-[calc(50%+4px)] hover:border-gold-500/60"
            style={{ left: `${point.x}%`, top: `${point.y}%`, width: `${nodeDiameter}%` }}
          >
            <span className="text-[11px] leading-tight text-ivory-100 sm:text-xs">{point.label}</span>
          </div>
        ))}
      </div>

      {/* Responsive alternative on mobile — the radial layout gets cramped below `sm`. */}
      <div className="flex flex-wrap justify-center gap-2 sm:hidden">
        <span className="rounded-full border border-gold-500 bg-emerald-700 px-4 py-2 text-xs font-medium text-gold-300">
          {center}
        </span>
        {nodes.map((label) => (
          <span
            key={label}
            className="rounded-full border border-emerald-600 bg-emerald-900 px-3 py-1.5 text-xs text-ivory-100"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
