"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";
import { notifyArticleSubmitted } from "@/lib/notifications";
import type { Member } from "@/generated/prisma/client";

async function generateUniqueSlug(model: "blog" | "author", title: string) {
  const base = slugify(title) || model;
  let slug = base;
  let suffix = 2;
  while (
    model === "blog" ? await db.blog.findUnique({ where: { slug } }) : await db.author.findUnique({ where: { slug } })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

/** Brief §31 — "If author is a member: link article to their member profile." One Author per Member, reused across every submission (Author.memberId is unique). */
async function getOrCreateAuthorForMember(member: Member) {
  const existing = await db.author.findUnique({ where: { memberId: member.id } });
  if (existing) return existing;

  const slug = await generateUniqueSlug("author", member.name);
  return db.author.create({
    data: { name: member.name, slug, bio: member.bio, photoUrl: member.photoUrl, memberId: member.id },
  });
}

const submitSchema = z.object({
  title: z.string().min(1, "Title is required"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Write something before submitting"),
  categoryId: z.string().min(1, "Select a category"),
  featuredImageUrl: z.string().optional(),
});

/**
 * Brief §31 — "Member submits article → Draft stored → Admin notified."
 * Creates a real Blog row (status DRAFT, submissionStatus PENDING) rather
 * than a separate submissions table — the schema was already written this
 * way from Phase 5 (see Blog.content's own doc comment) specifically so
 * this reuses the exact same model/admin edit page every other post does,
 * not a parallel review UI. Never sets status to PUBLISHED itself — only
 * admin approval (reviewArticleSubmission in admin/blogs/actions.ts) can.
 */
export async function submitArticle(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const existingPending = await db.blog.findFirst({
    where: { submittedByMemberId: member.id, submissionStatus: "PENDING" },
  });
  if (existingPending) {
    return { error: "You already have an article awaiting review. Wait for a decision before submitting another.", success: false };
  }

  const author = await getOrCreateAuthorForMember(member);
  const slug = await generateUniqueSlug("blog", parsed.data.title);

  const post = await db.blog.create({
    data: {
      ...parsed.data,
      slug,
      authorId: author.id,
      status: "DRAFT",
      submittedByMemberId: member.id,
      submissionStatus: "PENDING",
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog.submitted_by_member",
    entity: "Blog",
    entityId: post.id,
    metadata: { memberId: member.id },
  });

  // Backlog #35 — the submission above is already committed; a failed
  // admin-alert email must not turn a successful submission into a 500 for
  // the member.
  try {
    await notifyArticleSubmitted({ memberName: member.name, title: post.title, blogId: post.id });
  } catch (error) {
    console.error("notifyArticleSubmitted failed (submission still saved):", error);
  }

  revalidatePath("/member/articles");
  revalidatePath("/admin/blogs");
  return { error: undefined, success: true };
}
