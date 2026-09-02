import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export function Introduction() {
  return (
    <section className="bg-navy-900 py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <SectionLabel number="01">About BWF</SectionLabel>
        <div>
          <p className="font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
            A private business community for Chennai&rsquo;s construction ecosystem — built
            around one simple rule: one category, one member, per chapter.
          </p>
          <p className="mt-6 max-w-2xl text-slate-400">
            Every member represents a single trade or specialisation within their chapter, so
            introductions inside BWF are never a conversation with a competitor. It is a
            structure built for trust, not just networking.
          </p>
        </div>
      </Container>
    </section>
  );
}
