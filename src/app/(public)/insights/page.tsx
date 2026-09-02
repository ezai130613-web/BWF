import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export const metadata: Metadata = {
  title: "Insights",
  description: "Construction guides, member success stories, and BWF news.",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categorySlug } = await searchParams;

  const [posts, categories] = await Promise.all([
    db.blog.findMany({
      where: {
        ...publiclyVisibleBlogWhere,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: { category: true, author: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.blogCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="py-24">
      <Container>
        <SectionLabel>Insights</SectionLabel>
        <h1 className="mt-4 max-w-2xl font-display text-4xl text-ivory-100 sm:text-5xl">
          Construction guides &amp; BWF news.
        </h1>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/insights"
            className={`rounded-full border px-4 py-1.5 text-sm ${!categorySlug ? "border-gold-500 text-gold-300" : "border-navy-600 text-slate-400"}`}
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/insights?category=${c.slug}`}
              className={`rounded-full border px-4 py-1.5 text-sm ${categorySlug === c.slug ? "border-gold-500 text-gold-300" : "border-navy-600 text-slate-400"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/insights/${post.slug}`} className="group flex flex-col">
              <MediaPlaceholder brief={`${post.title} — featured image`} className="aspect-[16/10]" />
              <p className="mt-4 text-xs uppercase tracking-wide text-gold-400">{post.category.name}</p>
              <p className="mt-2 font-display text-xl text-ivory-100 group-hover:text-gold-300">{post.title}</p>
              {post.excerpt ? <p className="mt-2 text-sm text-slate-400">{post.excerpt}</p> : null}
              <p className="mt-3 text-xs text-slate-500">
                {post.author.name}
                {post.publishedAt ? ` · ${post.publishedAt.toLocaleDateString()}` : ""}
              </p>
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="mt-12 text-slate-400">
            No articles published yet — check back soon.
          </p>
        ) : null}
      </Container>
    </div>
  );
}
