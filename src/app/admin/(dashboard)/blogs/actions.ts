"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";
import { notifyArticleReviewed } from "@/lib/notifications";
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

  const existing = await db.blog.findUniqueOrThrow({
    where: { id: blogId },
    include: { submittedByMember: { include: { user: true } } },
  });
  const wasPublished = existing.status === "PUBLISHED" || existing.status === "SCHEDULED";
  const willBePublished = status === "PUBLISHED" || status === "SCHEDULED";

  // Brief §31: "Approved / Rejected / Edited → Published" — approving and
  // editing-then-approving are the same code path here (same precedent as
  // MemberProfileRevision's review action), so a member submission only
  // flips PENDING -> APPROVED at the moment an admin actually publishes or
  // schedules it, not on an intermediate draft save while still reviewing/
  // editing it. Rejecting is its own explicit action (rejectArticleSubmission
  // below) — never implied by simply not publishing yet.
  const approvingSubmission = existing.submissionStatus === "PENDING" && willBePublished;

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
      ...(approvingSubmission
        ? { submissionStatus: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date() }
        : {}),
    },
  });

  await logActivity({
    userId: session.user.id,
    action: approvingSubmission ? "blog.submission_approved" : "blog.updated",
    entity: "Blog",
    entityId: blogId,
    metadata: { status },
  });

  // Backlog #35 — the approval above is already committed; a failed
  // notification email must not turn a successful approval into a 500 for
  // the admin.
  if (approvingSubmission && existing.submittedByMember) {
    const notifyEmail = existing.submittedByMember.user?.email ?? existing.submittedByMember.email;
    if (notifyEmail) {
      try {
        await notifyArticleReviewed({
          memberName: existing.submittedByMember.name,
          memberEmail: notifyEmail,
          title: rest.title,
          approved: true,
        });
      } catch (error) {
        console.error("notifyArticleReviewed failed (approval still saved):", error);
      }
    }
  }

  revalidateBlogPaths(existing.slug);
  return { error: undefined };
}

const rejectSchema = z.object({ blogId: z.string(), reviewNotes: z.string().optional() });

/** Brief §31's "Rejected" branch — the submission never publishes; the member is told, optionally with a reason. */
export async function rejectArticleSubmission(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const post = await db.blog.findUniqueOrThrow({
    where: { id: parsed.data.blogId },
    include: { submittedByMember: { include: { user: true } } },
  });
  if (post.submissionStatus !== "PENDING") return { error: "This submission has already been reviewed." };

  await db.blog.update({
    where: { id: post.id },
    data: {
      submissionStatus: "REJECTED",
      reviewedById: session.user.id,
      reviewNotes: parsed.data.reviewNotes || undefined,
      reviewedAt: new Date(),
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog.submission_rejected",
    entity: "Blog",
    entityId: post.id,
  });

  // Backlog #35 — the rejection above is already committed; a failed
  // notification email must not turn a successful rejection into a 500 for
  // the admin.
  if (post.submittedByMember) {
    const notifyEmail = post.submittedByMember.user?.email ?? post.submittedByMember.email;
    if (notifyEmail) {
      try {
        await notifyArticleReviewed({
          memberName: post.submittedByMember.name,
          memberEmail: notifyEmail,
          title: post.title,
          approved: false,
          reviewNotes: parsed.data.reviewNotes || undefined,
        });
      } catch (error) {
        console.error("notifyArticleReviewed failed (rejection still saved):", error);
      }
    }
  }

  revalidatePath(`/admin/blogs/${post.id}`);
  revalidatePath("/admin/blogs");
  revalidatePath("/member/articles");
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

// Blog Categories and Authors folded onto this page (Phase 20 correction —
// both used to be standalone admin pages; a category/author only ever needs
// to exist to be picked on a post, so managing them here avoids a separate
// nav item for a one-field catalog).

const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function createBlogCategory(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = slugify(parsed.data.name);
  const existing = await db.blogCategory.findUnique({ where: { slug } });
  if (existing) return { error: "A category with that name already exists." };

  const category = await db.blogCategory.create({
    data: { name: parsed.data.name, slug, description: parsed.data.description },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog_category.created",
    entity: "BlogCategory",
    entityId: category.id,
  });

  revalidatePath("/admin/blogs");
  revalidatePath("/insights");
  return { error: undefined };
}

const createAuthorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  memberId: z.string().optional(),
});

export async function createAuthor(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = createAuthorSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    memberId: formData.get("memberId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const baseSlug = slugify(parsed.data.name) || "author";
  let slug = baseSlug;
  let suffix = 2;
  while (await db.author.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  if (parsed.data.memberId) {
    const existing = await db.author.findUnique({ where: { memberId: parsed.data.memberId } });
    if (existing) return { error: "That member already has an author profile." };
  }

  const author = await db.author.create({
    data: { ...parsed.data, slug },
  });

  await logActivity({
    userId: session.user.id,
    action: "author.created",
    entity: "Author",
    entityId: author.id,
  });

  revalidatePath("/admin/blogs");
  return { error: undefined };
}
