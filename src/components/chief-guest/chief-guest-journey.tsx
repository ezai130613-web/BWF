import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

const STEPS = [
  {
    title: "Submit Your Application",
    body: "Complete the Chief Guest application with your personal and company details.",
  },
  {
    title: "BWF Reviews Your Profile",
    body: "The BWF team reviews your application and assesses suitable opportunities.",
  },
  {
    title: "Meeting Coordination",
    body: "If selected, the BWF team coordinates the chapter, meeting date and participation details with you.",
  },
  {
    title: "Attend & Connect",
    body: "Participate in the meeting, introduce your organisation and connect with BWF professionals.",
  },
];

function StepNumber({ i }: { i: number }) {
  return (
    <span className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gold-500 bg-emerald-800 font-display text-sm text-gold-300">
      {i + 1}
    </span>
  );
}

export function ChiefGuestJourney() {
  return (
    <section className="bg-emerald-800 py-28">
      <Container>
        <SectionLabel>Chief Guest Experience</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          How It Works
        </p>

        {/* Mobile / tablet — vertical timeline, a stretchy connecting line down the left column. */}
        <ol className="mt-14 flex flex-col gap-2 lg:hidden">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <StepNumber i={i} />
                {i < STEPS.length - 1 ? <span className="my-2 w-px flex-1 bg-emerald-600" aria-hidden="true" /> : null}
              </div>
              <div className="pb-8">
                <h3 className="font-display text-lg text-ivory-100">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Desktop — horizontal timeline, one shared connecting line behind the numbered circles. */}
        <div className="relative mt-14 hidden lg:block">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-px bg-emerald-600" aria-hidden="true" />
          <ol className="grid grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col items-center text-center">
                <StepNumber i={i} />
                <h3 className="mt-4 font-display text-lg text-ivory-100">{step.title}</h3>
                <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
