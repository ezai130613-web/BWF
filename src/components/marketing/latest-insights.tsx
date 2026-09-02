import Link from "next/link";
import { db } from "@/lib/db";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

export async function LatestInsights() {
  const posts = await db.blog.findMany({
    where: publiclyVisibleBlogWhere,
    include: { category: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <section className="bg-navy-800 py-28">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <SectionLabel number="06">Insights</SectionLabel>
          <Link href="/insights" className="text-sm font-medium text-gold-400 hover:underline">
            View all →
          </Link>
        </div>
        <p className="mt-6 max-w-xl font-display text-3xl leading-snug text-ivory-100 sm:text-4xl">
          Construction guides, member success stories, and BWF news.
        </p>

        {posts.length > 0 ? (
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/insights/${post.slug}`} className="group flex flex-col">
                <MediaPlaceholder brief={`${post.title} — featured image`} className="aspect-[16/10]" />
                <p className="mt-4 text-xs uppercase tracking-wide text-gold-400">{post.category.name}</p>
                <p className="mt-2 text-ivory-100 group-hover:text-gold-300">{post.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">No articles published yet — check back soon.</p>
        )}
      </Container>
    </section>
  );
}
