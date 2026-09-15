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

// Founder/Co-Founder are fixed — see the same list's comment on the chapter
// detail page (src/app/admin/(dashboard)/chapters/[id]/page.tsx). Enforced
// here too, not just by hiding the UI, since this is a directly-postable
// server action.
const FOUNDING_ROLE_KEYS = ["FOUNDER", "CO_FOUNDER"];

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

  const role = await db.chapterLeadershipRole.findUniqueOrThrow({ where: { id: roleId } });
  if (FOUNDING_ROLE_KEYS.includes(role.key)) {
    return { error: "Founder and Co-Founder are fixed and can't be reassigned here." };
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

  const entry = await db.chapterLeadership.findUniqueOrThrow({
    where: { id: leadershipId },
    include: { role: true },
  });
  if (FOUNDING_ROLE_KEYS.includes(entry.role.key)) {
    return; // Founder/Co-Founder are fixed — see FOUNDING_ROLE_KEYS above.
  }

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

// ---------------------------------------------------------------------------
// Phase 20 Batch 3 — Roster Sheet "Coordinators" (Power Date Coordinator,
// Visitor Coordinator, etc. — renamed from "Host" 2026-09-15). Deliberately
// NOT ChapterLeadership — see RosterAssignment's schema comment for why —
// but managed from the same chapter detail page, under the same
// chapters:manage gate, as a direct sibling of the Leadership section above.
// ---------------------------------------------------------------------------

const assignRosterRoleSchema = z.object({
  chapterId: z.string(),
  memberId: z.string().min(1, "Select a member"),
  roleId: z.string().min(1, "Select a role"),
});

export async function assignRosterRole(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = assignRosterRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, memberId, roleId } = parsed.data;

  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  if (member.chapterId !== chapterId) {
    return { error: "That member does not belong to this chapter." };
  }

  await db.rosterAssignment.upsert({
    where: { chapterId_roleId_memberId: { chapterId, roleId, memberId } },
    update: {},
    create: { chapterId, roleId, memberId },
  });

  await logActivity({
    userId: session.user.id,
    action: "chapter.roster_role_assigned",
    entity: "Chapter",
    entityId: chapterId,
    metadata: { memberId, roleId },
  });

  revalidatePath(`/admin/chapters/${chapterId}`);
  return { error: undefined };
}

export async function removeRosterAssignment(chapterId: string, assignmentId: string) {
  const session = await requirePermission("chapters:manage");

  await db.rosterAssignment.delete({ where: { id: assignmentId } });

  await logActivity({
    userId: session.user.id,
    action: "chapter.roster_role_removed",
    entity: "Chapter",
    entityId: chapterId,
  });

  revalidatePath(`/admin/chapters/${chapterId}`);
}
