import { Hero } from "@/components/marketing/hero";
import { BusinessGeneratedSection } from "@/components/marketing/business-generated-section";
import { Introduction } from "@/components/marketing/introduction";
import { WhyBwf } from "@/components/marketing/why-bwf";
import { Chapters } from "@/components/marketing/chapters";
import { FindProfessional } from "@/components/marketing/find-professional";
import { InsideBwf } from "@/components/marketing/inside-bwf";
import { ChiefGuestsSection } from "@/components/marketing/chief-guests-section";
import { StatementBanner } from "@/components/marketing/statement-banner";
import { LatestInsights } from "@/components/marketing/latest-insights";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { MembershipCta } from "@/components/marketing/membership-cta";

// Phase 14 (brief §60 — caching) — ceiling on top of the existing
// revalidatePath() calls throughout admin actions, which still fire
// instantly on a real change; this just stops every request from hitting
// the database when nothing has.
export const revalidate = 3600;

export default function Home() {
  return (
    <>
      <Hero />
      <BusinessGeneratedSection />
      <Introduction />
      <WhyBwf />
      <Chapters />
      <FindProfessional />
      <InsideBwf />
      <ChiefGuestsSection />
      <StatementBanner lines={["Business Built Through Relationships."]} />
      <TestimonialsSection />
      <LatestInsights />
      <MembershipCta />
    </>
  );
}
