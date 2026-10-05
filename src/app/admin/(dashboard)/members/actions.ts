"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { TEMPORARY_PASSWORD, assignUsernames } from "@/lib/auth/member-credentials";
import { computeActiveSlotKey, SLOT_TAKEN_ERROR } from "@/lib/members/slot";
import { memberProfileFieldsSchema, normalizeMemberProfileFields } from "@/lib/members/profile-fields";
import { slugify } from "@/lib/slugify";
import { normalizeCompanyName } from "@/lib/companies/normalize";
import { GST_FORMAT_ERROR, isValidGstNumber, normalizeGstNumber } from "@/lib/companies/gst";
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
  photoUrl: z.string().optional(),
  // 2026-10-05 client correction — the company is typed on this form: an
  // existing one is picked by id, otherwise a new one is created from the
  // company* fields below in the same transaction as the member.
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyDescription: z.string().optional(),
  companyLogoUrl: z.string().optional(),
  companyGstNumber: z.string().optional(),
  chapterId: z.string().min(1, "Select a chapter"),
  categoryId: z.string().min(1, "Select a category"),
  // Phase 20 Batch 5, decision #6 — manual induction picker: who invited
  // this member, if anyone. Deliberately NOT part of memberProfileFieldsSchema
  // (shared with the member's own self-service profile-edit request flow) —
  // this is an admin-only call, set once at creation, never something a
  // member requests to change about themselves.
  referredByMemberId: z.string().optional(),
});

export type CreateMemberState = { error?: string; savedAt?: number };

export async function createMember(_prevState: CreateMemberState | undefined, formData: FormData): Promise<CreateMemberState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const {
    chapterId,
    categoryId,
    companyId,
    companyName,
    companyWebsite,
    companyDescription,
    companyLogoUrl,
    companyGstNumber,
    referredByMemberId,
    photoUrl,
    ...rest
  } = parsed.data;

  // Central/Super Admin can create in any chapter; a Chapter Admin only in
  // their own — enforced here, not just hidden in the UI. Creating the
  // member's company along with it needs no separate companies:manage.
  await requireChapterAccess(chapterId, "members:manage");

  const gstNumber = companyGstNumber ? normalizeGstNumber(companyGstNumber) : undefined;
  if (gstNumber && !isValidGstNumber(gstNumber)) return { error: GST_FORMAT_ERROR };

  const companies = await db.company.findMany({ select: { id: true, name: true, gstNumber: true } });
  const gstOwner = gstNumber ? companies.find((c) => c.gstNumber === gstNumber) : undefined;

  let existingCompany: (typeof companies)[number] | undefined;
  if (companyId) {
    existingCompany = companies.find((c) => c.id === companyId);
    if (!existingCompany) return { error: "That company no longer exists — reload the page." };
    if (gstOwner && gstOwner.id !== existingCompany.id) {
      return { error: `GST number ${gstNumber} is already registered to “${gstOwner.name}”.` };
    }
  } else {
    const target = normalizeCompanyName(companyName ?? "");
    if (!target) return { error: "Enter the member's company." };
    const duplicate = companies.find((c) => normalizeCompanyName(c.name) === target);
    if (duplicate) {
      return { error: `“${duplicate.name}” already exists — select it from the list instead of creating it again.` };
    }
    if (gstOwner) {
      return { error: `GST number ${gstNumber} is already registered to “${gstOwner.name}” — select that company instead.` };
    }
  }

  const slug = await generateUniqueMemberSlug(parsed.data.name);

  try {
    const { member, createdCompanyId } = await db.$transaction(async (tx) => {
      let memberCompanyId: string;
      let createdCompanyId: string | null = null;
      if (existingCompany) {
        memberCompanyId = existingCompany.id;
        // Fill in a GST number the company didn't have yet; never overwrite one.
        if (gstNumber && !existingCompany.gstNumber) {
          await tx.company.update({ where: { id: existingCompany.id }, data: { gstNumber } });
        }
      } else {
        const company = await tx.company.create({
          data: {
            name: companyName!.trim(),
            website: companyWebsite || undefined,
            description: companyDescription || undefined,
            logoUrl: companyLogoUrl || undefined,
            gstNumber,
          },
        });
        memberCompanyId = company.id;
        createdCompanyId = company.id;
      }

      const member = await tx.member.create({
        data: {
          ...rest,
          slug,
          email: rest.email || undefined,
          photoUrl: photoUrl || undefined,
          companyId: memberCompanyId,
          chapterId,
          categoryId,
          referredByMemberId: referredByMemberId || undefined,
          activeSlotKey: computeActiveSlotKey("ACTIVE", chapterId, categoryId),
        },
      });
      return { member, createdCompanyId };
    });

    if (createdCompanyId) {
      await logActivity({
        action: "company.created",
        entity: "Company",
        entityId: createdCompanyId,
        metadata: { viaMemberId: member.id },
      });
    }
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
    if (isUniqueConstraintError(error, "gstNumber")) {
      return { error: `GST number ${gstNumber} is already registered to another company.` };
    }
    throw error;
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/companies");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/members/[slug]", "page");
  revalidatePath("/apply");
  return { savedAt: Date.now() };
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

const updateInductionSchema = z.object({
  memberId: z.string(),
  referredByMemberId: z.string().optional(),
});

/**
 * Phase 20 Batch 5, decision #6 — a separate action from updateMemberProfile
 * on purpose: "who inducted this member" is an admin-only correction, not a
 * field a member can request to change about their own profile (the shared
 * memberProfileFieldsSchema/self-edit-revision flow never touches it).
 */
export async function updateMemberInduction(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = updateInductionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { memberId, referredByMemberId } = parsed.data;
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");

  if (referredByMemberId === memberId) {
    return { error: "A member can't be their own inductor." };
  }

  await db.member.update({
    where: { id: memberId },
    data: { referredByMemberId: referredByMemberId || null },
  });

  await logActivity({
    action: "member.induction_updated",
    entity: "Member",
    entityId: memberId,
    metadata: { referredByMemberId: referredByMemberId || null },
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/app-activity");
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

export type MemberLoginResult = { error?: string; username?: string; password?: string };

/**
 * One-click member login (2026-10-03): the next BWFCC username for the
 * member's chapter + the shared temporary password, flagged so the member
 * must verify an email and set a private password on first sign-in — the
 * same scheme as the bulk generator (src/lib/auth/member-credentials.ts).
 */
export async function createMemberLogin(memberId: string): Promise<MemberLoginResult> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  const session = await requireChapterAccess(member.chapterId, "members:manage").then(() => requireAdminSession());

  if (member.userId) return { error: "This member already has a login." };
  if (member.status !== "ACTIVE") return { error: "Only active members can be given a login." };

  const memberRole = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  const passwordHash = await hashPassword(TEMPORARY_PASSWORD);

  // Retry once if another admin took the same next number at the same moment.
  for (let attempt = 0; attempt < 2; attempt++) {
    const username = (await assignUsernames([{ id: member.id, chapterId: member.chapterId }])).get(member.id)!;
    try {
      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: member.name,
            username,
            password: passwordHash,
            mustChangePassword: true,
            temporaryPasswordIssuedAt: new Date(),
            roles: { create: { roleId: memberRole.id } },
          },
        });
        const linked = await tx.member.updateMany({ where: { id: member.id, userId: null }, data: { userId: user.id } });
        if (linked.count !== 1) throw new Error("already-linked");
      });
      await logActivity({ userId: session.user.id, action: "member.portal_access_granted", entity: "Member", entityId: memberId, metadata: { username } });
      revalidatePath(`/admin/members/${memberId}`);
      revalidatePath("/admin/member-credentials");
      return { username, password: TEMPORARY_PASSWORD };
    } catch (err) {
      if (err instanceof Error && err.message === "already-linked") return { error: "This member was just given a login by someone else — reload the page." };
      if (attempt === 1) return { error: "Couldn't create the login — please try again." };
    }
  }
  return { error: "Couldn't create the login — please try again." };
}

/** Puts a not-yet-activated member back on the temporary password (forgotten, locked out, or a suspected misuse). */
export async function resetMemberTemporaryPassword(memberId: string): Promise<MemberLoginResult> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId }, include: { user: true } });
  const session = await requireChapterAccess(member.chapterId, "members:manage").then(() => requireAdminSession());
  if (!member.user?.username || !member.user.mustChangePassword) {
    return { error: "This member has already activated their account — they can use “Forgot password” instead." };
  }
  await db.user.update({
    where: { id: member.user.id },
    data: {
      password: await hashPassword(TEMPORARY_PASSWORD),
      temporaryPasswordIssuedAt: new Date(),
      sessionVersion: { increment: 1 },
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await logActivity({ userId: session.user.id, action: "member.credentials_reissued", entity: "Member", entityId: memberId, metadata: { count: 1 } });
  revalidatePath(`/admin/members/${memberId}`);
  return { username: member.user.username, password: TEMPORARY_PASSWORD };
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
  // Backlog #35 — the review decision above is already committed; a failed
  // notification email must not turn a successful review into a 500 for
  // the admin.
  const notifyEmail = member.user?.email ?? member.email;
  if (notifyEmail) {
    try {
      await notifyProfileRevisionReviewed({
        memberName: member.name,
        memberEmail: notifyEmail,
        approved: intent === "approve",
        reviewNotes: reviewNotes || undefined,
      });
    } catch (error) {
      console.error("notifyProfileRevisionReviewed failed (review decision still saved):", error);
    }
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
