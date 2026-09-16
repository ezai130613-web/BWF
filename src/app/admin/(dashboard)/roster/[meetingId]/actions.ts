"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { getExcludedMemberIds } from "@/lib/roster/manage";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — the single
 * "Save Roster" action (requirement 9). Called directly from the client
 * wizard (src/components/admin/roster-wizard.tsx) as a plain async
 * function, not through a <form action> — the payload is a nested object
 * (scores array, category ids, chief guest ids), not FormData, and Next.js
 * Server Actions support that natively.
 *
 * One transaction: upserts the Roster row (notes toggle, chief guests, open
 * categories), recomputes the "All Other Members" ranking by a stable
 * descending-score sort (ties keep the submitted relative order — same
 * array position they were already displayed in, which is itself either
 * the previous save's order or the carry-forward/joinedAt default — so
 * "retain previous relative order" falls out of this for free), and writes
 * RosterScore rows via delete-all-then-createMany rather than one upsert
 * per member. Real bug caught only by testing against a real 51-member
 * chapter, not against a handful of test rows: N sequential per-row
 * upserts over a real network round-trip to Neon took several seconds and
 * made the wizard's "Download PDF" button look broken (it hadn't actually
 * finished saving yet by the time a quick manual check looked at it).
 * RosterScore rows have no other row referencing their id, so wiping and
 * recreating them is safe and cuts this to 3 queries total regardless of
 * member count.
 */

export type SaveRosterMemberInput = { memberId: string; score: number };

export type SaveRosterInput = {
  meetingId: string;
  chiefGuestIds: string[];
  openCategoryIds: string[];
  notesEnabled: boolean;
  members: SaveRosterMemberInput[];
};

export async function saveRoster(input: SaveRosterInput): Promise<{ error?: string }> {
  const meeting = await db.meeting.findUnique({ where: { id: input.meetingId } });
  if (!meeting) return { error: "That meeting no longer exists." };

  await requireChapterAccess(meeting.chapterId, "roster:manage");

  // Never trust client-submitted ids: chief guests must belong to this
  // meeting's chapter, categories must be real rows, and members must still
  // be genuinely eligible "All Other Members" for this chapter right now —
  // same discipline as the old route's chiefGuestIds re-check.
  const eligibleMemberIds = await getExcludedMemberIds(meeting.chapterId).then(async (excluded) => {
    const members = await db.member.findMany({
      where: { chapterId: meeting.chapterId, status: "ACTIVE", rosterEligible: true, id: { notIn: [...excluded] } },
      select: { id: true },
    });
    return new Set(members.map((m) => m.id));
  });

  const [validChiefGuests, validCategories] = await Promise.all([
    input.chiefGuestIds.length
      ? db.chiefGuest.findMany({ where: { id: { in: input.chiefGuestIds }, chapterId: meeting.chapterId } })
      : Promise.resolve([]),
    input.openCategoryIds.length
      ? db.category.findMany({ where: { id: { in: input.openCategoryIds } } })
      : Promise.resolve([]),
  ]);

  const submittedMembers = input.members.filter((m) => eligibleMemberIds.has(m.memberId));

  // Stable sort — equal scores keep their submitted relative order, which
  // is already whatever order the wizard displayed them in.
  const ranked = [...submittedMembers].sort((a, b) => b.score - a.score);

  await db.$transaction(
    async (tx) => {
      const roster = await tx.roster.upsert({
        where: { meetingId: input.meetingId },
        create: {
          meetingId: input.meetingId,
          notesEnabled: input.notesEnabled,
          savedAt: new Date(),
          chiefGuests: { connect: validChiefGuests.map((g) => ({ id: g.id })) },
          openCategories: { connect: validCategories.map((c) => ({ id: c.id })) },
        },
        update: {
          notesEnabled: input.notesEnabled,
          savedAt: new Date(),
          chiefGuests: { set: validChiefGuests.map((g) => ({ id: g.id })) },
          openCategories: { set: validCategories.map((c) => ({ id: c.id })) },
        },
      });

      // Wipe and recreate rather than upsert-per-row: also naturally drops
      // scores for members no longer eligible/submitted (left the chapter,
      // went inactive, or moved into a leadership/coordinator role since
      // the last save), with no separate cleanup query needed.
      await tx.rosterScore.deleteMany({ where: { rosterId: roster.id } });
      if (ranked.length > 0) {
        await tx.rosterScore.createMany({
          data: ranked.map((m, i) => ({ rosterId: roster.id, memberId: m.memberId, score: m.score, order: i })),
        });
      }
    },
    { timeout: 10000, maxWait: 5000 },
  );

  await logActivity({
    action: "roster.saved",
    entity: "Meeting",
    entityId: input.meetingId,
    metadata: { chapterId: meeting.chapterId, memberCount: ranked.length },
  });

  revalidatePath(`/admin/roster/${input.meetingId}`);
  revalidatePath("/admin/roster");

  return {};
}
