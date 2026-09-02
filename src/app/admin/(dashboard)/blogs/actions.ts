"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";
import type { Prisma } from "@/generated/prisma/client";

async function generateUniqueBlogSlug(title: string) {
  const base = slugify(title) || "post";
  let slug = base;
  let suffix = 2;
  while (await db.blog.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function revalidateBlogPaths(slug?: string) {
  revalidatePath("/admin/blogs");
  revalidatePath("/insights");
  revalidatePath("/insights/[slug]", "page");
  revalidatePath("/");
  if (slug) revalidatePath(`/insights/${slug}`);
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  categoryId: z.string().min(1, "Select a category"),
  authorId: z.string().min(1, "Select an author"),
});

export async function createBlog(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = await generateUniqueBlogSlug(parsed.data.title);

  const post = await db.blog.create({
    data: { ...parsed.data, slug, content: "" },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog.created",
    entity: "Blog",
    entityId: post.id,
  });

  revalidateBlogPaths();
  redirect(`/admin/blogs/${post.id}`);
}

const faqEntrySchema = z.object({ question: z.string(), answer: z.string() });

const updateSchema = z.object({
  blogId: z.string(),
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  categoryId: z.string().min(1),
  authorId: z.string().min(1),
  tags: z.string().optional(), // comma-separated
  featuredImageUrl: z.string().optional(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
  faq: z.string().optional(), // JSON-encoded FaqEntry[]
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ARCHIVED"]),
  scheduledAt: z.string().optional(),
});

export async function updateBlog(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { blogId, tags, faq, status, scheduledAt, ...rest } = parsed.data;

  const tagNames = (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const tagConnections = [];
  for (const name of tagNames) {
    const tagSlug = slugify(name);
    const tag = await db.blogTag.upsert({
      where: { slug: tagSlug },
      update: {},
      create: { name, slug: tagSlug },
    });
    tagConnections.push({ id: tag.id });
  }

  let faqEntries: Prisma.InputJsonValue | undefined;
  if (faq) {
    try {
      const parsedFaq = z.array(faqEntrySchema).parse(JSON.parse(faq));
      faqEntries = parsedFaq.filter((f) => f.question.trim() && f.answer.trim());
    } catch {
      return { error: "Invalid FAQ data." };
    }
  }

  const existing = await db.blog.findUniqueOrThrow({ where: { id: blogId } });
  const wasPublished = existing.status === "PUBLISHED" || existing.status === "SCHEDULED";
  const willBePublished = status === "PUBLISHED" || status === "SCHEDULED";

  await db.blog.update({
    where: { id: blogId },
    data: {
      ...rest,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      // publishedAt is set the first time a post ever goes live, and kept
      // stable afterward — not reset on every edit, so "updated" vs
      // "published" dates stay meaningfully different (brief §29).
      publishedAt: !wasPublished && willBePublished ? new Date() : existing.publishedAt,
      faq: faqEntries,
      tags: { set: tagConnections },
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog.updated",
    entity: "Blog",
    entityId: blogId,
    metadata: { status },
  });

  revalidateBlogPaths(existing.slug);
  return { error: undefined };
}

export async function deleteBlog(blogId: string) {
  const session = await requirePermission("blogs:manage");

  const post = await db.blog.findUniqueOrThrow({ where: { id: blogId } });
  // Soft-delete by archiving (brief §43) — never a hard delete from the UI.
  await db.blog.update({ where: { id: blogId }, data: { status: "ARCHIVED" } });

  await logActivity({ userId: session.user.id, action: "blog.archived", entity: "Blog", entityId: blogId });

  revalidateBlogPaths(post.slug);
}
