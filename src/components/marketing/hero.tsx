import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";
import { TrackedButton } from "@/components/analytics/tracked-button";

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden">
      <MediaPlaceholder
        brief="Hero background — full-bleed cinematic photo or video of premium architecture/interiors, very minimal text overlay"
        className="absolute inset-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/70 to-navy-950/20" />

      <Container className="relative pb-24 pt-40">
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] text-ivory-100 sm:text-6xl lg:text-7xl">
          Built on connections.
        </h1>
        <p className="mt-6 max-w-xl font-display text-xl italic text-gold-300 sm:text-2xl">
          Where Chennai&rsquo;s construction leaders do business.
        </p>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400">
          Builders World Forum brings together selected professionals across the construction
          ecosystem within an exclusive, chapter-based business community.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button href="/chapters" variant="secondary">
            Visit a Chapter
          </Button>
          <TrackedButton href="/apply" variant="primary" eventName="become_member_click" eventParams={{ location: "hero" }}>
            Apply for Membership
          </TrackedButton>
        </div>
      </Container>
    </section>
  );
}
