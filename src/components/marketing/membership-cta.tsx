import { Container } from "@/components/ui/container";
import { TrackedButton } from "@/components/analytics/tracked-button";

export function MembershipCta() {
  return (
    <section className="bg-navy-950 py-28">
      <Container className="flex flex-col items-start gap-8">
        <p className="font-display text-5xl leading-[1.05] text-ivory-100 sm:text-6xl">
          Your category.
          <br />
          Your chapter.
          <br />
          <span className="text-gold-500">Your network.</span>
        </p>
        <TrackedButton href="/apply" variant="primary" eventName="become_member_click" eventParams={{ location: "membership_cta" }}>
          Check Availability →
        </TrackedButton>
      </Container>
    </section>
  );
}
