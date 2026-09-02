import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export function ComingSoonPage({
  eyebrow,
  title,
  phaseNote,
}: {
  eyebrow: string;
  title: string;
  phaseNote: string;
}) {
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-24">
      <SectionLabel>{eyebrow}</SectionLabel>
      <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-slate-400">{phaseNote}</p>
    </Container>
  );
}
