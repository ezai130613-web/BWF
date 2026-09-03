import { db } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { pluralize } from "@/lib/seo/pluralize";

/**
 * Brief §52 — Programmatic SEO. A landing page exists for every (active
 * category) × (distinct location among active chapters) combination —
 * chapter-agnostic, since brief §52's own examples ("/architects-in-
 * chennai") name a city, not a specific chapter, and a city can have
 * several chapters (brief §5's current seed: three chapters, all Chennai).
 * "Location/category combinations may be added later" (brief §52) — this
 * recomputes from live data on every call rather than a static list, so a
 * newly-added category or chapter location becomes a real page automatically,
 * no code change needed.
 */
export type ProgrammaticLandingPage = {
  slug: string;
  categoryId: string;
  categoryName: string;
  location: string;
};

export function landingSlugFor(categoryName: string, location: string): string {
  return `${slugify(pluralize(categoryName))}-in-${slugify(location)}`;
}

export async function listProgrammaticLandingPages(): Promise<ProgrammaticLandingPage[]> {
  // Sequential rather than Promise.all — see the comment in src/app/sitemap.ts,
  // one of this function's two callers, for why.
  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  const chapters = await db.chapter.findMany({ where: { status: "ACTIVE", location: { not: null } }, select: { location: true } });

  const locations = [...new Set(chapters.map((c) => c.location!))];

  const pages: ProgrammaticLandingPage[] = [];
  for (const category of categories) {
    for (const location of locations) {
      pages.push({
        slug: landingSlugFor(category.name, location),
        categoryId: category.id,
        categoryName: category.name,
        location,
      });
    }
  }
  return pages;
}

export async function resolveProgrammaticLandingPage(slug: string): Promise<ProgrammaticLandingPage | null> {
  const pages = await listProgrammaticLandingPages();
  return pages.find((p) => p.slug === slug) ?? null;
}
