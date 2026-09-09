import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { ChiefGuestsCarousel } from "@/components/marketing/chief-guests-carousel";

export async function ChiefGuestsSection() {
  const guests = await db.chiefGuest.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }, { createdAt: "desc" }],
  });

  if (guests.length === 0) return null;

  return (
    <section className="bg-emerald-800 py-28">
      <Container>
        <SectionLabel>Chief Guests at BWF</SectionLabel>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Industry leaders and decision-makers who have connected with the BWF community.
        </p>

        <ChiefGuestsCarousel
          guests={guests.map((g) => ({
            id: g.id,
            name: g.name,
            company: g.company ?? "",
            designation: g.designation,
            photoUrl: g.photoUrl,
          }))}
        />
      </Container>
    </section>
  );
}
