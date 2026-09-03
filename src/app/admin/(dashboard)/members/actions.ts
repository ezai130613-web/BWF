"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { hashPassword, newPasswordSchema } from "@/lib/auth/password";
import { computeActiveSlotKey, SLOT_TAKEN_ERROR } from "@/lib/members/slot";
import { memberProfileFieldsSchema, normalizeMemberProfileFields } from "@/lib/members/profile-fields";
import { slugify } from "@/lib/slugify";
import { notifyProfileRevisionReviewed } from "@/lib/notifications";
import type { $Enums } from "@/generated/prisma/client";

async function generateUniqueMemberSlug(name: string) {
  const base = slugify(name) || "member";
  let slug = base;
  let suffix = 2;
  while (await db.member.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().min(1, "Select a company"),
  chapterId: z.string().min(1, "Select a chapter"),
  categoryId: z.string().min(1, "Select a category"),
});

export async function createMember(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, categoryId, companyId, ...rest } = parsed.data;

  // Central/Super Admin can create in any chapter; a Chapter Admin only in
  // their own — enforced here, not just hidden in the UI.
  await requireChapterAccess(chapterId, "members:manage");

  const slug = await generateUniqueMemberSlug(parsed.data.name);

  try {
    const member = await db.member.create({
      data: {
        ...rest,
        slug,
        email: rest.email || undefined,
        companyId,
        chapterId,
        categoryId,
        activeSlotKey: computeActiveSlotKey("ACTIVE", chapterId, categoryId),
      },
    });

    await logActivity({
      action: "member.created",
      entity: "Member",
      entityId: member.id,
      metadata: { chapterId, categoryId },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "activeSlotKey")) {
      return { error: SLOT_TAKEN_ERROR };
    }
    throw error;
  }

  revalidatePath("/admin/members");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/members/[slug]", "page");
  revalidatePath("/apply");
  return { error: undefined };
}

export async function updateMemberStatus(memberId: string, status: $Enums.MemberStatus) {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");

  try {
    await db.member.update({
      where: { id: memberId },
      data: {
        status,
        activeSlotKey: computeActiveSlotKey(status, member.chapterId, member.categoryId),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "activeSlotKey")) {
      throw new Error(SLOT_TAKEN_ERROR);
    }
    throw error;
  }

  await logActivity({
    action: "member.status_changed",
    entity: "Member",
    entityId: memberId,
    metadata: { status },
  });

  revalidatePath("/admin/members");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/members/[slug]", "page");
  revalidatePath("/apply");
}

const updateProfileSchema = memberProfileFieldsSchema.extend({ memberId: z.string() });

export async function updateMemberProfile(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { memberId, ...data } = parsed.data;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");

  await db.member.update({
    where: { id: memberId },
    data: normalizeMemberProfileFields(data),
  });

  await logActivity({ action: "member.profile_updated", entity: "Member", entityId: memberId });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/members/[slug]", "page");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}

// ---------------------------------------------------------------------------
// Phase 11 — member portal login access (brief §12) + profile edit review
// (brief §20). Gated the same way as everything else on this page
// (requireChapterAccess(..., "members:manage")) rather than users:manage —
// granting a member's own portal login is part of managing that member, not
// part of managing admin accounts, so a Chapter Admin can do this for their
// own chapter's members without needing Super-Admin-only access.
// ---------------------------------------------------------------------------

const grantPortalAccessSchema = z.object({
  memberId: z.string(),
  email: z.email(),
  password: newPasswordSchema,
});

export async function grantMemberPortalAccess(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = grantPortalAccessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { memberId, email, password } = parsed.data;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");

  if (member.userId) return { error: "This member already has portal access." };

  const normalizedEmail = email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "A login already exists with that email address." };

  const memberRole = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name: member.name,
      email: normalizedEmail,
      password: passwordHash,
      roles: { create: { roleId: memberRole.id } },
    },
  });

  await db.member.update({ where: { id: memberId }, data: { userId: user.id } });

  await logActivity({
    action: "member.portal_access_granted",
    entity: "Member",
    entityId: memberId,
    metadata: { email: normalizedEmail },
  });

  revalidatePath(`/admin/members/${memberId}`);
  return { error: undefined };
}

export async function toggleMemberPortalAccess(memberId: string) {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");
  if (!member.userId) throw new Error("This member has no portal login yet.");

  const user = await db.user.findUniqueOrThrow({ where: { id: member.userId } });
  const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  await db.user.update({
    where: { id: user.id },
    data: {
      status: nextStatus,
      // Same as suspending an admin user — kill any session already open
      // in their browser rather than waiting for the JWT to expire.
      sessionVersion: { increment: 1 },
    },
  });

  await logActivity({
    action: nextStatus === "SUSPENDED" ? "member.portal_access_revoked" : "member.portal_access_restored",
    entity: "Member",
    entityId: memberId,
  });

  revalidatePath(`/admin/members/${memberId}`);
}

const reviewRevisionSchema = memberProfileFieldsSchema.extend({
  revisionId: z.string(),
  intent: z.enum(["approve", "reject"]),
  reviewNotes: z.string().optional(),
});

/**
 * One action covers all three brief §20 options: Reject leaves Member
 * untouched; Approve and "Edit and Approve" are the same code path here —
 * whatever is in the form when "Approve" is clicked gets applied, whether
 * that's the member's original proposal unmodified or admin's own edits to
 * it. There's no meaningful difference in what the system needs to do
 * between those two once framed as "apply the form's current values."
 */
export async function reviewMemberProfileRevision(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = reviewRevisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { revisionId, intent, reviewNotes, ...fields } = parsed.data;

  const revision = await db.memberProfileRevision.findUniqueOrThrow({ where: { id: revisionId } });
  if (revision.status !== "PENDING") return { error: "This request has already been reviewed." };

  const member = await db.member.findUniqueOrThrow({ where: { id: revision.memberId }, include: { user: true } });
  await requireChapterAccess(member.chapterId, "members:manage");
  const session = await requireAdminSession();

  if (intent === "approve") {
    await db.member.update({ where: { id: member.id }, data: normalizeMemberProfileFields(fields) });
  }

  await db.memberProfileRevision.update({
    where: { id: revisionId },
    data: {
      status: intent === "approve" ? "APPROVED" : "REJECTED",
      reviewedById: session.user.id,
      reviewNotes: reviewNotes || undefined,
      reviewedAt: new Date(),
    },
  });

  await logActivity({
    userId: session.user.id,
    action: intent === "approve" ? "member_profile_revision.approved" : "member_profile_revision.rejected",
    entity: "MemberProfileRevision",
    entityId: revisionId,
    metadata: { memberId: member.id },
  });

  // Only a member with portal access can ever submit a revision (the whole
  // workflow is gated behind requireMemberProfile()), so their login email
  // (member.user.email) always exists — prefer it over the public contact
  // field (member.email), which is a separate, often-empty column and would
  // otherwise silently skip notifying members who never filled it in.
  const notifyEmail = member.user?.email ?? member.email;
  if (notifyEmail) {
    await notifyProfileRevisionReviewed({
      memberName: member.name,
      memberEmail: notifyEmail,
      approved: intent === "approve",
      reviewNotes: reviewNotes || undefined,
    });
  }

  revalidatePath(`/admin/members/${member.id}`);
  revalidatePath("/admin/members");
  if (intent === "approve") {
    revalidatePath("/members");
    revalidatePath("/members/[slug]", "page");
    revalidatePath("/chapters/[slug]", "page");
  }
  return { error: undefined };
}

function isUniqueConstraintError(error: unknown, field: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002" &&
    "meta" in error &&
    JSON.stringify((error as { meta?: unknown }).meta).includes(field)
  );
}
