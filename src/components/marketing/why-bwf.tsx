import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const PILLARS = [
  {
    title: "Category Exclusivity",
    statement: "One category. One member. Less competition. More opportunity.",
    body: "BWF creates clearly defined business categories within each chapter, allowing members to build stronger professional recall and referral relationships.",
  },
  {
    title: "Chapter-Based Structure",
    statement: "Build relationships through consistency.",
    body: "Members meet regularly within their chapters, allowing professional relationships to develop beyond one-time networking.",
  },
  {
    title: "Curated Construction Ecosystem",
    statement: "The people involved in building, all in one network.",
    body: "Builders, architects, contractors, consultants, suppliers and specialist service providers connect within one focused construction ecosystem.",
  },
  {
    title: "Chief Guest Connect",
    statement: "Meet decision-makers beyond the chapter.",
    body: "BWF regularly invites influential Chief Guests, business leaders and organizations who can interact with members, understand their capabilities and potentially create valuable industry connections and business opportunities.",
  },
];

export function WhyBwf() {
  return (
    <section className="bg-emerald-800 py-28">
      <Container>
        <SectionLabel number="02">Why BWF</SectionLabel>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => (
            <div
              key={pillar.title}
              className="rounded-sm border border-emerald-600 p-6 transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-sm text-gold-500">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-2 font-display text-xl text-ivory-100">{pillar.title}</h2>
              <p className="mt-3 text-sm font-medium text-gold-300">{pillar.statement}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{pillar.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
