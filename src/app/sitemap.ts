import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";
import { listProgrammaticLandingPages } from "@/lib/seo/programmatic";
import { SITE_URL } from "@/lib/site";

const STATIC_ROUTES = [
  "",
  "/about",
  "/chapters",
  "/members",
  "/insights",
  "/events",
  "/apply",
  "/testimonials",
  "/faqs",
  "/feedback",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sequential, not Promise.all — this route alone would otherwise fire 5
  // queries (plus 2 more nested inside listProgrammaticLandingPages) at
  // once, right as `next build`'s other static-generation workers are also
  // hitting the same local `prisma dev` database concurrently. That combined
  // burst was enough to trip the documented local-dev connection flakiness
  // (docs/ARCHITECTURE.md) during this phase's build — a real Neon/Postgres
  // deployment has far more headroom, but there's no reason for this one
  // build-time route to be the thing that pushes local dev over the edge.
  const chapters = await db.chapter.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } });
  const members = await db.member.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } });
  const posts = await db.blog.findMany({ where: publiclyVisibleBlogWhere, select: { slug: true, updatedAt: true } });
  const events = await db.event.findMany({ select: { slug: true, updatedAt: true } });
  const authors = await db.author.findMany({ select: { slug: true, updatedAt: true } });
  const landingPages = await listProgrammaticLandingPages();

  return [
    ...STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...chapters.map((c) => ({ url: `${SITE_URL}/chapters/${c.slug}`, lastModified: c.updatedAt })),
    ...members.map((m) => ({ url: `${SITE_URL}/members/${m.slug}`, lastModified: m.updatedAt })),
    ...posts.map((p) => ({ url: `${SITE_URL}/insights/${p.slug}`, lastModified: p.updatedAt })),
    ...events.map((e) => ({ url: `${SITE_URL}/events/${e.slug}`, lastModified: e.updatedAt })),
    ...authors.map((a) => ({ url: `${SITE_URL}/authors/${a.slug}`, lastModified: a.updatedAt })),
    ...landingPages.map((p) => ({ url: `${SITE_URL}/${p.slug}` })),
  ];
}
