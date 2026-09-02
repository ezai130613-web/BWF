import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";
import { renderMarkdown } from "@/lib/blog/render";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { MediaPlaceholder } from "@/components/ui/media-placeholder";

async function getPost(slug: string) {
  return db.blog.findFirst({
    where: { slug, ...publiclyVisibleBlogWhere },
    include: { category: true, author: true, tags: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
    openGraph: {
      title: post.ogTitle || post.seoTitle || post.title,
      description: post.ogDescription || post.metaDescription || post.excerpt || undefined,
      images: post.ogImageUrl || post.featuredImageUrl ? [post.ogImageUrl || post.featuredImageUrl!] : undefined,
      type: "article",
    },
  };
}

type FaqEntry = { question: string; answer: string };

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const faqEntries = Array.isArray(post.faq) ? (post.faq as unknown as FaqEntry[]) : [];

  const relatedPosts = await db.blog.findMany({
    where: { ...publiclyVisibleBlogWhere, categoryId: post.categoryId, id: { not: post.id } },
    take: 3,
    orderBy: { publishedAt: "desc" },
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    author: { "@type": "Person", name: post.author.name },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
  };

  const faqJsonLd =
    faqEntries.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <article className="py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      ) : null}

      <Container className="max-w-3xl">
        <SectionLabel>{post.category.name}</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link href={`/authors/${post.author.slug}`} className="text-gold-400 hover:underline">
            {post.author.name}
          </Link>
          {post.publishedAt ? <span>· {post.publishedAt.toLocaleDateString()}</span> : null}
          <span>· Updated {post.updatedAt.toLocaleDateString()}</span>
        </div>

        <MediaPlaceholder brief={`${post.title} — featured image`} className="mt-8 aspect-[16/9]" />

        <div
          className="prose prose-invert prose-headings:font-display prose-a:text-gold-400 mt-10 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        {faqEntries.length > 0 ? (
          <div className="mt-14">
            <SectionLabel>Frequently asked questions</SectionLabel>
            <div className="mt-6 flex flex-col gap-6">
              {faqEntries.map((entry, i) => (
                <div key={i}>
                  <p className="font-medium text-ivory-100">{entry.question}</p>
                  <p className="mt-2 text-slate-400">{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {post.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag.id} className="rounded-full border border-navy-600 px-3 py-1 text-xs text-slate-400">
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {relatedPosts.length > 0 ? (
          <div className="mt-16 border-t border-navy-700 pt-10">
            <SectionLabel>More in {post.category.name}</SectionLabel>
            <div className="mt-6 flex flex-col gap-3">
              {relatedPosts.map((related) => (
                <Link key={related.id} href={`/insights/${related.slug}`} className="text-ivory-100 hover:text-gold-400">
                  {related.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </Container>
    </article>
  );
}
