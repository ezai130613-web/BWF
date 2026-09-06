import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { PhotoSlot } from "@/components/ui/photo-slot";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export const metadata: Metadata = {
  title: "About",
  description: "About Builders World Forum — a private, chapter-based business community for Chennai's construction ecosystem.",
};

const CONTENT_KEYS: string[] = [
  "about.intro",
  "about.purpose",
  "about.differentiators",
  "about.vision",
  "about.growth",
  "about.who",
  "founder1.name",
  "founder1.title",
  "founder1.photoUrl",
  "founder1.bio",
  "founder2.name",
  "founder2.title",
  "founder2.photoUrl",
  "founder2.bio",
];

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="mt-4 text-slate-300 first:mt-0">
          {paragraph}
        </p>
      ))}
    </>
  );
}

export default async function AboutPage() {
  const content = await getContent(CONTENT_KEYS);

  const intro = content["about.intro"];
  const purpose = content["about.purpose"];
  const differentiators = content["about.differentiators"]?.split("\n").filter(Boolean) ?? [];
  const vision = content["about.vision"];
  const growth = content["about.growth"];
  const who = content["about.who"];

  const pillars = [
    { heading: "Our Purpose", text: purpose },
    { heading: "Our Vision", text: vision },
    { heading: "Our Growth", text: growth },
    { heading: "Who Should Join BWF?", text: who },
  ].filter((p): p is { heading: string; text: string } => Boolean(p.text));

  const founders = [
    {
      name: content["founder1.name"],
      title: content["founder1.title"],
      photoUrl: content["founder1.photoUrl"],
      bio: content["founder1.bio"],
    },
    {
      name: content["founder2.name"],
      title: content["founder2.title"],
      photoUrl: content["founder2.photoUrl"],
      bio: content["founder2.bio"],
    },
  ].filter((f) => f.name && f.bio);

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>About</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">Builders World Forum</h1>
        {intro ? (
          <div className="mt-6">
            {intro.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mt-4 text-lg text-slate-300 first:mt-0">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-lg text-slate-300">
            A private business community for Chennai&rsquo;s construction ecosystem, built around one simple rule:
            one category, one member, per chapter.
          </p>
        )}

        {pillars.length > 0 ? (
          <section className="mt-20 grid gap-x-12 gap-y-12 border-t border-emerald-700/60 pt-16 sm:grid-cols-2">
            {pillars.map((pillar, i) => (
              <div key={i}>
                <h2 className="font-display text-2xl text-ivory-100">{pillar.heading}</h2>
                <Paragraphs text={pillar.text} />
              </div>
            ))}
          </section>
        ) : null}

        {differentiators.length > 0 ? (
          <section className="mt-16 border-t border-emerald-700/60 pt-16">
            <h2 className="font-display text-2xl text-ivory-100">What Makes BWF Different</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {differentiators.map((line, i) => {
                const [label, ...rest] = line.split(":");
                const detail = rest.join(":").trim();
                return (
                  <li key={i} className="rounded-xl border border-emerald-700 bg-emerald-800/40 p-5">
                    <p className="font-medium text-ivory-100">{label}</p>
                    <p className="mt-2 text-sm text-slate-300">{detail}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {founders.length > 0 ? (
          <section className="mt-16 border-t border-emerald-700/60 pt-16">
            <SectionLabel>Founders</SectionLabel>
            <div className="mt-6 flex flex-col gap-16">
              {founders.map((founder, i) => (
                <div key={i} className="flex flex-col items-start gap-8 sm:flex-row">
                  <PhotoSlot
                    src={founder.photoUrl}
                    alt={founder.name!}
                    brief={`${founder.name} — portrait`}
                    className="aspect-[4/5] w-full shrink-0 rounded-sm sm:w-64"
                  />
                  <div className="flex-1">
                    <h3 className="font-display text-xl text-ivory-100">{founder.name}</h3>
                    <p className="mt-1 text-sm font-medium uppercase tracking-[0.1em] text-gold-500">{founder.title}</p>
                    <Paragraphs text={founder.bio!} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
