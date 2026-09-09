import { SectionLabel } from "@/components/ui/section-label";

const VISITOR_CARDS = [
  {
    title: "Prospective Members",
    subheading: "Looking to Join BWF?",
    body: "Construction-industry professionals who want to understand BWF, experience a chapter meeting and explore becoming a member can register as visitors.",
  },
  {
    title: "End Consumers",
    subheading: "Building or Planning a Project?",
    body: "Homeowners, property owners and other end consumers who are planning construction, renovation or related work can visit BWF to understand the industry and connect with relevant professionals.",
  },
  {
    title: "Chief Guests / Business Connect",
    subheading: "Looking for Construction Partners?",
    body: "Large companies, institutions, developers and industry decision-makers looking for contractors, suppliers, consultants or construction professionals can participate as Chief Guests and connect with the chapter ecosystem.",
  },
];

export function WhoCanVisit() {
  return (
    <section className="mt-16 border-t border-emerald-700/60 pt-16">
      <SectionLabel>Who Can Visit BWF?</SectionLabel>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {VISITOR_CARDS.map((card, i) => (
          <div key={card.title} className="rounded-sm border border-emerald-700 p-6">
            <span className="font-display text-sm text-gold-500">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-2 font-display text-lg text-ivory-100">{card.title}</p>
            <p className="mt-3 text-sm font-medium text-gold-300">{card.subheading}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
