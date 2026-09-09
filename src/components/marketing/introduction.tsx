import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export function Introduction() {
  return (
    <section className="bg-emerald-900 py-28">
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

          <p className="mt-10 font-display text-xl text-ivory-100">
            One Category. One Member. One Powerful Network.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {["One Category", "One Member", "One Network"].map((label, i, arr) => (
              <div key={label} className="flex items-center gap-3">
                <span className="rounded-full border border-gold-500/60 px-5 py-2.5 text-sm font-medium text-gold-300">
                  {label}
                </span>
                {i < arr.length - 1 ? <span className="text-gold-500">→</span> : null}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
