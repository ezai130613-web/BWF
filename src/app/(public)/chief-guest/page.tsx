import type { Metadata } from "next";
import { ChiefGuestHero } from "@/components/chief-guest/chief-guest-hero";
import { ChiefGuestBenefits } from "@/components/chief-guest/chief-guest-benefits";
import { ChiefGuestAdvantage } from "@/components/chief-guest/chief-guest-advantage";
import { ChiefGuestEligibility } from "@/components/chief-guest/chief-guest-eligibility";
import { ChiefGuestJourney } from "@/components/chief-guest/chief-guest-journey";
import { ChiefGuestsSection } from "@/components/marketing/chief-guests-section";

export const revalidate = 3600; // same caching convention as the homepage

export const metadata: Metadata = {
  title: "Chief Guest",
  description:
    "Become a BWF Chief Guest — connect with Chennai's construction ecosystem, discover capable suppliers and build valuable business relationships.",
};

export default function ChiefGuestPage() {
  return (
    <>
      <ChiefGuestHero />
      <ChiefGuestBenefits />
      <ChiefGuestAdvantage />
      <ChiefGuestEligibility />
      <ChiefGuestJourney />
      <ChiefGuestsSection
        sectionLabel="Leaders Who Have Joined Us"
        heading="Distinguished business leaders and decision-makers who have already joined BWF as Chief Guests."
        cta={{ label: "Join Our Distinguished Chief Guests – Apply Now", href: "/visit?purpose=chief-guest" }}
        hideWhenEmpty={false}
      />
    </>
  );
}
