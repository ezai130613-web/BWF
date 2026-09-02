import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getChapterAvailability } from "@/lib/applications/availability";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { ApplyWizard } from "@/components/marketing/apply-wizard";

export const metadata: Metadata = {
  title: "Apply for Membership",
  description: "Check category availability and apply for Builders World Forum membership.",
};

export default async function ApplyPage() {
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const availabilityByCategory = Object.fromEntries(
    await Promise.all(categories.map(async (c) => [c.id, await getChapterAvailability(c.id)] as const)),
  );

  return (
    <div className="py-24">
      <Container className="max-w-2xl">
        <SectionLabel>Membership</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Apply for Membership
        </h1>
        <p className="mt-4 text-slate-400">
          One member per category, per chapter — check availability before you apply.
        </p>

        <div className="mt-12">
          <ApplyWizard categories={categories} availabilityByCategory={availabilityByCategory} />
        </div>
      </Container>
    </div>
  );
}
