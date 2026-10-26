import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { memberProfileFieldsSchema, normalizeMemberProfileFields } from "@/lib/members/profile-fields";
import type { Member } from "@/generated/prisma/client";

/**
 * Brief §20 — a member's edit never touches Member directly. It only ever
 * creates a PENDING MemberProfileRevision; admin approval (see
 * admin/members/actions.ts's reviewMemberProfileRevision) is the only path
 * that writes to Member. Shared by /member/profile and the mobile API.
 */
export async function submitProfileRevision(
  actor: { userId: string; memberId: string },
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = memberProfileFieldsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existingPending = await db.memberProfileRevision.findFirst({
    where: { memberId: actor.memberId, status: "PENDING" },
  });
  if (existingPending) {
    return { ok: false, error: "You already have an edit request awaiting review. Wait for a decision before submitting another." };
  }

  const changes = normalizeMemberProfileFields(parsed.data);

  const revision = await db.memberProfileRevision.create({
    data: {
      memberId: actor.memberId,
      // Round-trip through JSON so `undefined` optional fields satisfy
      // Prisma's strict InputJsonValue type — same tradeoff logActivity's
      // metadata already makes.
      changes: JSON.parse(JSON.stringify(changes)),
    },
  });

  await logActivity({
    userId: actor.userId,
    action: "member_profile_revision.submitted",
    entity: "MemberProfileRevision",
    entityId: revision.id,
    metadata: { memberId: actor.memberId },
  });
  return { ok: true, id: revision.id };
}

/**
 * The profile as the form strings the web edit form pre-fills. The review
 * screen shows any field missing from a revision as "changed to blank", so
 * a client that edits only some fields (the mobile app) must send the rest
 * unchanged. Galleries are left out, exactly like the web form: an absent
 * gallery means "unchanged" (see parseGalleryEntries).
 */
export function currentProfileFormValues(member: Member): Record<string, string> {
  const keys = Object.keys(memberProfileFieldsSchema.shape) as (keyof typeof memberProfileFieldsSchema.shape)[];
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = member[key as keyof Member];
    if (key === "photos" || key === "videos") continue;
    values[key] = value === null || value === undefined ? "" : String(value);
  }
  return values;
}
