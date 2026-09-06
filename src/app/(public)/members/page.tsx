import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MemberSearchForm } from "@/components/marketing/member-search-form";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = {
  title: "Find a BWF Professional",
  description: "Search the Builders World Forum member directory by chapter, category, or keyword.",
};

/** 24 cards fills 8 full rows at the grid's largest column count (lg:grid-cols-3) with no ragged partial row. */
const PAGE_SIZE = 24;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; category?: string; q?: string; page?: string }>;
}) {
  const { chapter: chapterSlug, category: categorySlug, q, page: pageParam } = await searchParams;

  const [chapters, categories] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const where = {
    status: "ACTIVE" as const,
    chapter: { status: "ACTIVE" as const, ...(chapterSlug ? { slug: chapterSlug } : {}) },
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
            { services: { contains: q, mode: "insensitive" as const } },
            { specialisations: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalMembers = await db.member.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalMembers / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const members = await db.member.findMany({
    where,
    include: { company: true, chapter: true, category: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  function buildHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (chapterSlug) qs.set("chapter", chapterSlug);
    if (categorySlug) qs.set("category", categorySlug);
    if (targetPage > 1) qs.set("page", String(targetPage));
    const query = qs.toString();
    return query ? `/members?${query}` : "/members";
  }

  const membersByChapter = new Map<string, typeof members>();
  for (const member of members) {
    const key = member.chapter.name;
    if (!membersByChapter.has(key)) membersByChapter.set(key, []);
    membersByChapter.get(key)!.push(member);
  }

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Find a BWF Professional</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          Member Directory
        </h1>

        <MemberSearchForm
          chapters={chapters}
          categories={categories}
          defaultQuery={q}
          defaultChapterSlug={chapterSlug}
          defaultCategorySlug={categorySlug}
        />

        {totalMembers > 0 ? (
          <p className="mt-8 text-sm text-slate-400">
            {totalMembers} member{totalMembers === 1 ? "" : "s"}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-16">
          {[...membersByChapter.entries()].map(([chapterName, chapterMembers]) => (
            <div key={chapterName}>
              <SectionLabel>{chapterName}</SectionLabel>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {chapterMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.slug}`}
                    className="rounded-sm border border-emerald-700 p-5 transition-colors hover:border-gold-500/50"
                  >
                    <p className="text-ivory-100">{member.name}</p>
                    <p className="mt-1 text-sm text-gold-400">{member.category.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{member.company.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-slate-400">No members match your search.</p>
          ) : null}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
      </Container>
    </div>
  );
}
