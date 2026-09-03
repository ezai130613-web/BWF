import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { resolveProgrammaticLandingPage } from "@/lib/seo/programmatic";
import { pluralize } from "@/lib/seo/pluralize";
import { breadcrumbJsonLd } from "@/lib/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

/**
 * Brief §52 — programmatic category/location landing pages
 * ("/architects-in-chennai"). A single dynamic catch-all at the public
 * root: Next.js resolves the fixed sibling folders (about, chapters,
 * members, ...) before ever reaching this one, so a real static route
 * always wins and this only ever handles genuine category-in-location
 * slugs — anything else falls through to notFound() below, a normal 404,
 * not fabricated content.
 *
 * Rendered on demand (no generateStaticParams), same as every other
 * slug-based detail route in this app (members/chapters/insights/events/
 * authors are all dynamic too) — pre-building every category×location
 * combination at deploy time isn't needed for a page that's fully
 * server-rendered either way, and doing so was what overloaded the local
 * `prisma dev` connection pool during `next build`'s concurrent static
 * generation (documented flakiness pattern, see docs/ARCHITECTURE.md).
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolveProgrammaticLandingPage(slug);
  if (!page) return {};

  const pluralCategory = pluralize(page.categoryName);
  return {
    title: `${pluralCategory} in ${page.location}`,
    description: `Browse verified ${pluralCategory} in ${page.location} — members of Builders World Forum, a private chapter-based business community.`,
  };
}

export default async function ProgrammaticLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await resolveProgrammaticLandingPage(slug);
  if (!page) notFound();

  const members = await db.member.findMany({
    where: {
      status: "ACTIVE",
      categoryId: page.categoryId,
      chapter: { status: "ACTIVE", location: page.location },
    },
    include: { company: true, chapter: true },
    orderBy: { name: "asc" },
  });

  const pluralCategory = pluralize(page.categoryName);

  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: `${pluralCategory} in ${page.location}`, path: `/${page.slug}` },
  ]);

  return (
    <div className="py-24">
      <JsonLd data={crumbs} />
      <Container>
        <SectionLabel>{page.location}</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          {pluralCategory} in {page.location}
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          Verified {pluralCategory.toLowerCase()} from Builders World Forum&rsquo;s chapters in {page.location} —
          one member per category, per chapter.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.slug}`}
              className="rounded-sm border border-navy-700 p-5 transition-colors hover:border-gold-500/50"
            >
              <p className="text-ivory-100">{member.name}</p>
              <p className="mt-1 text-sm text-gold-400">{member.chapter.name}</p>
              <p className="mt-1 text-sm text-slate-400">{member.company.name}</p>
            </Link>
          ))}
        </div>

        {members.length === 0 ? (
          <p className="mt-12 text-slate-400">
            No {pluralCategory.toLowerCase()} listed in {page.location} yet.{" "}
            <Link href="/members" className="text-gold-400 hover:underline">
              Browse the full directory →
            </Link>
          </p>
        ) : null}
      </Container>
    </div>
  );
}
