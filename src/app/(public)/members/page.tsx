import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

export const metadata: Metadata = {
  title: "Find a BWF Professional",
  description: "Search the Builders World Forum member directory by chapter, category, or keyword.",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; category?: string; q?: string }>;
}) {
  const { chapter: chapterSlug, category: categorySlug, q } = await searchParams;

  const [chapters, categories] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const members = await db.member.findMany({
    where: {
      status: "ACTIVE",
      chapter: { status: "ACTIVE", ...(chapterSlug ? { slug: chapterSlug } : {}) },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
              { services: { contains: q, mode: "insensitive" } },
              { specialisations: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { company: true, chapter: true, category: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

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

        <form className="mt-10 flex flex-wrap gap-4" action="/members">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name, company, or service…"
            className="min-w-[240px] flex-1 rounded-md border border-navy-600 bg-navy-900 px-4 py-2.5 text-sm text-ivory-100 placeholder:text-slate-500 focus:border-gold-500 focus:outline-none"
          />
          <select
            name="chapter"
            defaultValue={chapterSlug ?? ""}
            className="rounded-md border border-navy-600 bg-navy-900 px-4 py-2.5 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={categorySlug ?? ""}
            className="rounded-md border border-navy-600 bg-navy-900 px-4 py-2.5 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-navy-950 hover:bg-gold-400"
          >
            Search
          </button>
        </form>

        <div className="mt-12 flex flex-col gap-16">
          {[...membersByChapter.entries()].map(([chapterName, chapterMembers]) => (
            <div key={chapterName}>
              <SectionLabel>{chapterName}</SectionLabel>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {chapterMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.slug}`}
                    className="rounded-sm border border-navy-700 p-5 transition-colors hover:border-gold-500/50"
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
      </Container>
    </div>
  );
}
