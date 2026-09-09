import { Container } from "@/components/ui/container";

export function WhyMeetRegularly() {
  return (
    <section className="border-y border-emerald-700 bg-emerald-950 py-24">
      <Container>
        <p className="font-display text-4xl leading-[1.1] text-ivory-100 sm:text-6xl">
          Out of Sight <span className="text-gold-500">=</span> Out of Mind
        </p>
        <p className="mt-8 max-w-2xl text-lg text-slate-300 sm:text-xl">
          Regular Meetings = Stronger Recall = Stronger Relationships = Better Referrals
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          Meeting twice every month keeps members connected, helps them continuously understand
          one another&rsquo;s businesses, and makes it easier to remember the right member when an
          opportunity appears.
        </p>
      </Container>
    </section>
  );
}
