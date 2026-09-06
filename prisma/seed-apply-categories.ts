import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slugify";
import { APPLY_CATEGORY_NAMES } from "../src/lib/apply-categories";

/**
 * The "Select your business category" dropdown on /apply should offer BWF's
 * official category taxonomy, not the precise-but-messy literal labels the
 * roster PDFs produced ("SS Handrail / Fabrication", "Civil Contractor -
 * Govt. EA Licensed (Authorised Signatory)", etc.) — those stay exactly as
 * printed on each existing Member's own record (the client was explicit:
 * roster text is correct, don't rewrite it), they just shouldn't be offered
 * as generic options to a brand-new applicant.
 *
 * This only ADDS the canonical categories (active); it never deactivates or
 * otherwise touches any existing category or Member.categoryId. Every other
 * page that reads Category (members directory filter, admin's add-member
 * form, visitor registration, programmatic SEO landing pages) keeps showing
 * the roster-specific categories exactly as before — this is purely
 * additive. The /apply page itself is scoped to just this list separately,
 * in its own data-fetching code (src/app/(public)/apply/page.tsx).
 *
 * Safe to re-run. Run once via `npx tsx prisma/seed-apply-categories.ts`.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });


async function main() {
  for (const name of APPLY_CATEGORY_NAMES) {
    const slug = slugify(name);
    await db.category.upsert({ where: { slug }, update: { name, isActive: true }, create: { name, slug, isActive: true } });
  }
  console.log(`Upserted ${APPLY_CATEGORY_NAMES.length} canonical categories (active).`);
  console.log("Total categories now:", await db.category.count());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
