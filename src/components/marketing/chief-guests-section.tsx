import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { Button } from "@/components/ui/button";
import { ChiefGuestsCarousel } from "@/components/marketing/chief-guests-carousel";

/**
 * Reused on both the homepage and /chief-guest ("Leaders Who Have Joined Us") off the same
 * live ChiefGuest catalog — never duplicate the query/markup for a second copy. Defaults
 * reproduce the original homepage-only copy/behavior exactly, so the homepage's own
 * `<ChiefGuestsSection />` call (no props) is unaffected by this generalization.
 */
export async function ChiefGuestsSection({
  sectionLabel = "Chief Guests at BWF",
  heading = "Industry leaders and decision-makers who have connected with the BWF community.",
  cta,
  hideWhenEmpty = true,
}: {
  sectionLabel?: string;
  heading?: string;
  cta?: { label: string; href: string };
  hideWhenEmpty?: boolean;
}) {
  const guests = await db.chiefGuest.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }, { createdAt: "desc" }],
  });

  if (guests.length === 0 && hideWhenEmpty) return null;

  return (
    <section className="bg-emerald-800 py-28">
      <Container>
        <SectionLabel>{sectionLabel}</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          {heading}
        </p>

        {guests.length > 0 ? (
          <ChiefGuestsCarousel
            guests={guests.map((g) => ({
              id: g.id,
              name: g.name,
              company: g.company ?? "",
              designation: g.designation,
              photoUrl: g.photoUrl,
            }))}
          />
        ) : (
          <p className="mt-10 text-sm text-slate-400">
            Distinguished guests who join BWF meetings will be featured here soon.
          </p>
        )}

        {cta ? (
          <Button href={cta.href} variant="primary" className="mt-10">
            {cta.label}
          </Button>
        ) : null}
      </Container>
    </section>
  );
}
