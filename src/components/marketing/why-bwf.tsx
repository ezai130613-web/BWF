import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const PILLARS = [
  {
    title: "Category exclusivity",
    body: "Only one member per business category is admitted into a given chapter — so the plumber, the architect, and the civil contractor in the room are never competing with each other.",
  },
  {
    title: "Chapter-based structure",
    body: "Chapters meet locally within Chennai, each building its own concentrated network of trust rather than a diffuse, citywide member list.",
  },
  {
    title: "A curated construction ecosystem",
    body: "Membership is selective by design — every introduction inside BWF is with someone whose work has already been vetted into the community.",
  },
];

export function WhyBwf() {
  return (
    <section className="bg-navy-800 py-28">
      <Container>
        <SectionLabel number="02">Why BWF</SectionLabel>
        <div className="mt-10 grid gap-12 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title}>
              <h3 className="font-display text-2xl text-ivory-100">{pillar.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">{pillar.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
