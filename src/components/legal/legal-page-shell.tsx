import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

/**
 * Marks a fact a lawyer/BWF admin must supply or confirm before this
 * document is final (entity name, jurisdiction, retention periods, etc.) —
 * see the backlog item this was drafted for (docs/ARCHITECTURE.md's Open
 * Decisions table: "Legal review of Privacy Policy / Terms & Conditions
 * copy"). Kept visually distinct so it can't be mistaken for settled text.
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-gold-500/10 px-1 py-0.5 font-medium text-gold-400">[{children}]</span>;
}

export function LegalPageShell({
  eyebrow,
  title,
  lastUpdated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: React.ReactNode;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-24">
      <Container>
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-slate-400">Last updated: {lastUpdated}</p>

        {intro ? <p className="mt-8 text-lg text-slate-300">{intro}</p> : null}

        <div className="prose prose-invert prose-headings:font-display prose-a:text-gold-400 prose-strong:text-ivory-100 mt-10 max-w-none">
          {children}
        </div>
      </Container>
    </div>
  );
}
