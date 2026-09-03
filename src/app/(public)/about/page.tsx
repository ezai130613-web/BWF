import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export const revalidate = 3600; // Phase 14 — brief §60 caching, see homepage's comment

export const metadata: Metadata = {
  title: "About",
  description: "About Builders World Forum — a private, chapter-based business community for Chennai's construction ecosystem.",
};

export default async function AboutPage() {
  const content = await getContent(["about.intro"]);

  return (
    <div className="py-24">
      <Container className="max-w-3xl">
        <SectionLabel>About</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Builders World Forum
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          {content["about.intro"] ??
            "A private business community for Chennai's construction ecosystem, built around one simple rule: one category, one member, per chapter."}
        </p>
      </Container>
    </div>
  );
}
