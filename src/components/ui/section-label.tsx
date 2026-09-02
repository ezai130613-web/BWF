import { cn } from "@/lib/utils";

export function SectionLabel({
  number,
  children,
  className,
}: {
  number?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-sm font-medium tracking-[0.2em] text-gold-500", className)}>
      {number ? <span className="font-display text-base">{number}</span> : null}
      <span className="uppercase">{children}</span>
    </div>
  );
}
