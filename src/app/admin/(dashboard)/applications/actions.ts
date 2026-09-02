"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { computeActiveSlotKey, SLOT_TAKEN_ERROR } from "@/lib/members/slot";
import { slugify } from "@/lib/slugify";
import type { $Enums } from "@/generated/prisma/client";

function revalidateApplicationPaths(id: string) {
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
}

export async function updateApplicationStatus(applicationId: string, status: $Enums.ApplicationStatus) {
  const session = await requirePermission("applications:manage");

  await db.membershipApplication.update({ where: { id: applicationId }, data: { status } });

  await logActivity({
    userId: session.user.id,
    action: "application.status_changed",
    entity: "MembershipApplication",
    entityId: applicationId,
    metadata: { status },
  });

  revalidateApplicationPaths(applicationId);
}

const notesSchema = z.object({ applicationId: z.string(), notes: z.string().optional() });

export async function updateApplicationNotes(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("applications:manage");

  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };

  await db.membershipApplication.update({
    where: { id: parsed.data.applicationId },
    data: { notes: parsed.data.notes || null },
  });

  await logActivity({
    userId: session.user.id,
    action: "application.notes_updated",
    entity: "MembershipApplication",
    entityId: parsed.data.applicationId,
  });

  revalidateApplicationPaths(parsed.data.applicationId);
  return { error: undefined };
}

const reassignSchema = z.object({ applicationId: z.string(), chapterId: z.string().min(1, "Select a chapter") });

/** Brief §16 — admin assigns a waitlisted applicant to a chapter (possibly DRAFT/internal) once one opens up. */
export async function reassignApplicationChapter(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("applications:manage");

  const parsed = reassignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.membershipApplication.update({
    where: { id: parsed.data.applicationId },
    data: { chapterId: parsed.data.chapterId, status: "UNDER_REVIEW" },
  });

  await logActivity({
    userId: session.user.id,
    action: "application.chapter_assigned",
    entity: "MembershipApplication",
    entityId: parsed.data.applicationId,
    metadata: { chapterId: parsed.data.chapterId },
  });

  revalidateApplicationPaths(parsed.data.applicationId);
  return { error: undefined };
}

/**
 * Brief §17 step 7 — the only way a Member ever gets created from an
 * application. Never automatic on approval/payment; always this explicit
 * admin action. Auto-creates (or reuses, matched by name) the applicant's
 * Company since it doesn't exist as a real record yet at application time.
 */
export async function convertApplicationToMember(applicationId: string) {
  const session = await requirePermission("applications:manage");

  const application = await db.membershipApplication.findUniqueOrThrow({ where: { id: applicationId } });

  if (!application.chapterId) {
    throw new Error("Assign a chapter before converting this application to a member.");
  }
  if (application.convertedMemberId) {
    throw new Error("This application has already been converted.");
  }

  let company = await db.company.findFirst({ where: { name: application.companyName } });
  if (!company) {
    company = await db.company.create({ data: { name: application.companyName } });
  }

  const baseSlug = slugify(application.name) || "member";
  let slug = baseSlug;
  let suffix = 2;
  while (await db.member.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  try {
    const member = await db.member.create({
      data: {
        slug,
        name: application.name,
        designation: application.designation,
        email: application.email,
        phone: application.phone,
        companyId: company.id,
        chapterId: application.chapterId,
        categoryId: application.categoryId,
        activeSlotKey: computeActiveSlotKey("ACTIVE", application.chapterId, application.categoryId),
      },
    });

    await db.membershipApplication.update({
      where: { id: applicationId },
      data: { convertedMemberId: member.id, status: "PAID" },
    });

    await logActivity({
      userId: session.user.id,
      action: "application.converted_to_member",
      entity: "MembershipApplication",
      entityId: applicationId,
      metadata: { memberId: member.id },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002" &&
      JSON.stringify((error as { meta?: unknown }).meta).includes("activeSlotKey")
    ) {
      throw new Error(SLOT_TAKEN_ERROR);
    }
    throw error;
  }

  revalidateApplicationPaths(applicationId);
  revalidatePath("/admin/members");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/members");
  revalidatePath("/");
}
