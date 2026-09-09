import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const ATTENDEES = [
  {
    title: "Members",
    body: "Active BWF chapter members representing different construction-industry categories.",
  },
  {
    title: "Visitors",
    body: "Prospective members and end consumers who want to experience BWF or connect with construction professionals.",
  },
  {
    title: "Chief Guests",
    body: "Business leaders, companies, institutions and industry decision-makers invited to interact with the BWF chapter and explore potential opportunities.",
  },
];

export function MeetingAttendees() {
  return (
    <section className="bg-emerald-900 py-24">
      <Container>
        <SectionLabel>Who Attends a BWF Meeting?</SectionLabel>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {ATTENDEES.map((a) => (
            <div
              key={a.title}
              className="rounded-sm border border-emerald-700 p-6 transition-colors hover:border-gold-500/50"
            >
              <p className="font-display text-xl text-ivory-100">{a.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{a.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
