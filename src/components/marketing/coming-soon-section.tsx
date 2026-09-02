import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export function ComingSoonSection({
  number,
  label,
  title,
  note,
}: {
  number: string;
  label: string;
  title: string;
  note: string;
}) {
  return (
    <section className="bg-navy-800 py-24">
      <Container>
        <SectionLabel number={number}>{label}</SectionLabel>
        <p className="mt-6 font-display text-2xl text-ivory-100 sm:text-3xl">{title}</p>
        <p className="mt-3 max-w-md text-sm text-slate-400">{note}</p>
      </Container>
    </section>
  );
}
