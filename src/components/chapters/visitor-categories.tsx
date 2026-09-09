import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const CATEGORIES = [
  {
    title: "Prospective Member",
    body: "Construction-industry professional exploring BWF membership.",
  },
  {
    title: "End Consumer",
    body: "Someone planning construction, renovation or a related project and looking to understand/connect with relevant professionals.",
  },
  {
    title: "Chief Guest / Business Connect",
    body: "Company, institution or decision-maker looking for contractors, suppliers, consultants or construction-industry connections.",
  },
];

export function VisitorCategories() {
  return (
    <section className="bg-emerald-800 py-24">
      <Container>
        <SectionLabel>Who Can Visit a BWF Meeting?</SectionLabel>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-sm border border-emerald-600 p-6">
              <p className="font-display text-lg text-ivory-100">{c.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{c.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
