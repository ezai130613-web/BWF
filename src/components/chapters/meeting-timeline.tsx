import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const STEPS = [
  { title: "Members Arrive & Network", body: "Members, visitors and Chief Guests connect before the formal meeting begins." },
  {
    title: "30-Second Member Introductions",
    body: "Every member briefly introduces their name, company, business category, what they do, and the kind of connection or opportunity they're looking for.",
  },
  {
    title: "Business Resource Session",
    body: "A 10-minute session where a member shares insight on the market's biggest project — surfacing genuine business prospects for the rest of the chapter.",
  },
  {
    title: "Hot Seat Presentation",
    body: "One member presents their business in depth for 5 minutes, followed by 3 minutes of questions from the chapter — 8 minutes total.",
  },
  { title: "Referrals", body: "Members announce the genuine business referrals they've passed to fellow members." },
  { title: "Thank You Slips", body: "Members acknowledge business successfully received through BWF referrals." },
  { title: "One-to-One Activity", body: "Members share the individual meetings they've completed with other chapter members." },
  { title: "Power Date Update", body: "The Power Date Coordinator announces Power Dates completed since the previous meeting." },
  { title: "Conclave Update", body: "The Conclave Coordinator announces group Conclaves completed since the previous meeting." },
  { title: "Chief Guest / Guest Speaker", body: "The Chief Guest or Guest Speaker interacts with the chapter, shares knowledge and connects with relevant members." },
  { title: "Networking Continues", body: "Members and visitors continue conversations and identify possible collaborations after the structured meeting." },
];

export function MeetingTimeline() {
  return (
    <section className="bg-emerald-800 py-24">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel>What Happens During the Meeting?</SectionLabel>
          <span className="hidden text-xs text-slate-500 lg:block">Scroll for more →</span>
        </div>
        <div className="relative mt-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-0 lg:overflow-x-auto lg:pb-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4 lg:w-64 lg:flex-shrink-0 lg:flex-col lg:gap-0 lg:px-4">
                <div className="flex flex-col items-center lg:flex-row">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gold-500/60 font-display text-sm text-gold-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-emerald-600 lg:ml-0 lg:mt-0 lg:h-px lg:w-full" />
                  ) : null}
                </div>
                <div className="pb-8 lg:pb-0 lg:pt-4">
                  <p className="font-medium text-ivory-100">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-emerald-800 to-transparent lg:block" />
        </div>
      </Container>
    </section>
  );
}
