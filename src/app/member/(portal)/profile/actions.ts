"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { memberProfileFieldsSchema, normalizeMemberProfileFields } from "@/lib/members/profile-fields";

/**
 * Brief §20 — a member's edit never touches Member directly. It only ever
 * creates a PENDING MemberProfileRevision; admin approval (see
 * admin/members/actions.ts's reviewMemberProfileRevision) is the only path
 * that writes to Member.
 */
export async function submitProfileRevision(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = memberProfileFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existingPending = await db.memberProfileRevision.findFirst({
    where: { memberId: member.id, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "You already have an edit request awaiting review. Wait for a decision before submitting another." };
  }

  const changes = normalizeMemberProfileFields(parsed.data);

  const revision = await db.memberProfileRevision.create({
    data: {
      memberId: member.id,
      // Round-trip through JSON so `undefined` optional fields satisfy
      // Prisma's strict InputJsonValue type — same tradeoff logActivity's
      // metadata already makes.
      changes: JSON.parse(JSON.stringify(changes)),
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "member_profile_revision.submitted",
    entity: "MemberProfileRevision",
    entityId: revision.id,
    metadata: { memberId: member.id },
  });

  revalidatePath("/member/profile");
  return { error: undefined, success: true };
}
