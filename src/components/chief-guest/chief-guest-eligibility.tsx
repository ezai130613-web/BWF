import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const CATEGORIES = [
  {
    title: "Business Owners & Founders",
    body: "Founders, proprietors, entrepreneurs and owners of established businesses.",
  },
  {
    title: "Directors & Senior Executives",
    body: "Managing Directors, CEOs, Executive Directors, General Managers and other senior business leaders.",
  },
  {
    title: "Purchase & Procurement Leaders",
    body: "Purchase Heads, Procurement Managers, Sourcing Heads and senior professionals responsible for major purchasing or vendor decisions.",
  },
  {
    title: "Industry & Corporate Leaders",
    body: "Senior representatives of established companies, large organisations, multinational corporations and businesses across different industries.",
  },
];

export function ChiefGuestEligibility() {
  return (
    <section className="bg-emerald-950 py-28">
      <Container>
        <SectionLabel>Eligibility</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Who Can Become a BWF Chief Guest?
        </p>
        <p className="mt-4 max-w-xl text-slate-400">
          We welcome business owners and senior decision-makers from construction and other
          industries who can contribute to meaningful professional conversations.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {CATEGORIES.map((category, i) => (
            <div
              key={category.title}
              className="rounded-sm border border-emerald-700 p-6 transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-sm text-gold-500">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 font-display text-lg text-ivory-100">{category.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{category.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-sm border border-emerald-700 bg-emerald-800/40 p-6 text-sm leading-relaxed text-slate-400">
          <p>
            Chief Guests do not have to belong exclusively to the construction industry —
            applications are open to eligible business leaders from other industries as well.
            The Chief Guest program is open to external business leaders only; existing BWF
            members are not eligible to apply as a Chief Guest. All applications are subject to
            review and approval by BWF management.
          </p>
        </div>
      </Container>
    </section>
  );
}
