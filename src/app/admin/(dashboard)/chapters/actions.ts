"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().optional(),
});

export async function createChapter(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = slugify(parsed.data.name);
  const existing = await db.chapter.findUnique({ where: { slug } });
  if (existing) return { error: "A chapter with that name already exists." };

  // New chapters start DRAFT (brief §16 — internal-only until explicitly
  // published), not ACTIVE. Publish from the chapter's own edit page.
  const chapter = await db.chapter.create({
    data: { name: parsed.data.name, slug, location: parsed.data.location, status: "DRAFT" },
  });

  await logActivity({
    userId: session.user.id,
    action: "chapter.created",
    entity: "Chapter",
    entityId: chapter.id,
  });

  revalidatePath("/admin/chapters");
  return { error: undefined };
}

const updateSchema = z.object({
  chapterId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  meetingSchedule: z.string().optional(),
  meetingVenue: z.string().optional(),
  meetingAddress: z.string().optional(),
  googleMapsUrl: z.string().optional(),
});

export async function updateChapter(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, ...data } = parsed.data;

  await db.chapter.update({ where: { id: chapterId }, data });

  await logActivity({
    userId: session.user.id,
    action: "chapter.updated",
    entity: "Chapter",
    entityId: chapterId,
  });

  revalidatePath("/admin/chapters");
  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/apply"); // chapter status affects category availability shown there
  return { error: undefined };
}

const assignLeadershipSchema = z.object({
  chapterId: z.string(),
  memberId: z.string().min(1, "Select a member"),
  roleId: z.string().min(1, "Select a role"),
});

export async function assignChapterLeadership(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = assignLeadershipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, memberId, roleId } = parsed.data;

  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  if (member.chapterId !== chapterId) {
    return { error: "That member does not belong to this chapter." };
  }

  await db.chapterLeadership.upsert({
    where: { chapterId_roleId_memberId: { chapterId, roleId, memberId } },
    update: {},
    create: { chapterId, roleId, memberId },
  });

  await logActivity({
    userId: session.user.id,
    action: "chapter.leadership_assigned",
    entity: "Chapter",
    entityId: chapterId,
    metadata: { memberId, roleId },
  });

  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}

export async function removeChapterLeadership(chapterId: string, leadershipId: string) {
  const session = await requirePermission("chapters:manage");

  await db.chapterLeadership.delete({ where: { id: leadershipId } });

  await logActivity({
    userId: session.user.id,
    action: "chapter.leadership_removed",
    entity: "Chapter",
    entityId: chapterId,
  });

  revalidatePath(`/admin/chapters/${chapterId}`);
  revalidatePath("/");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
}
