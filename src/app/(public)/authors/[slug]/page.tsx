import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

async function getAuthor(slug: string) {
  return db.author.findUnique({ where: { slug }, include: { member: true } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};
  return { title: author.name, description: author.bio ?? undefined };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const posts = await db.blog.findMany({
    where: { ...publiclyVisibleBlogWhere, authorId: author.id },
    include: { category: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="py-24">
      <Container className="max-w-3xl">
        <SectionLabel>Author</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{author.name}</h1>
        {author.bio ? <p className="mt-4 max-w-xl text-slate-400">{author.bio}</p> : null}
        {author.member ? (
          <Link href={`/members/${author.member.slug}`} className="mt-2 inline-block text-sm text-gold-400 hover:underline">
            View member profile →
          </Link>
        ) : null}

        <div className="mt-14 flex flex-col gap-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/insights/${post.slug}`} className="group">
              <p className="text-xs uppercase tracking-wide text-gold-400">{post.category.name}</p>
              <p className="mt-1 font-display text-xl text-ivory-100 group-hover:text-gold-300">{post.title}</p>
            </Link>
          ))}
          {posts.length === 0 ? <p className="text-slate-400">No published articles yet.</p> : null}
        </div>
      </Container>
    </div>
  );
}
