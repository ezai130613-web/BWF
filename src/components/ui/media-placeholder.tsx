import { cn } from "@/lib/utils";

/**
 * Stand-in for real photography until it's sourced (see docs/ARCHITECTURE.md
 * open decisions). Renders a textured dark gradient in the right aspect
 * ratio so layout/typography can be judged honestly, plus a small on-page
 * brief of what should be shot/sourced for this slot — swap for next/image
 * once real photography lands and delete the label.
 */
export function MediaPlaceholder({
  brief,
  className,
}: {
  brief: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-navy-600 via-navy-800 to-navy-950",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, transparent, transparent 46px, currentColor 46px, currentColor 47px)",
          color: "var(--color-ivory-100)",
        }}
      />
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-navy-600/40 blur-3xl" />
      <div className="absolute inset-0 flex items-end p-4">
        <p className="rounded-sm border border-gold-500/30 bg-navy-950/70 px-2.5 py-1 text-[11px] leading-snug text-slate-400">
          {brief}
        </p>
      </div>
    </div>
  );
}
