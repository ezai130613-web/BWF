import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Which fellow members a signed-in member can see in the picker and in Find
 * Members Nearby, and record activity against (2026-10-26, mobile launch).
 *
 * Members of an ACTIVE chapter see members of ACTIVE chapters — unchanged
 * behaviour. Members of any other chapter (in practice the hidden DRAFT
 * "App Review" chapter used for Apple's reviewer login) see only their own
 * chapter, so a demo account can never create referrals, slips or
 * one-to-ones against real members, and real members never see demo ones.
 */
export async function fellowMemberScope(viewerMemberId: string): Promise<Prisma.MemberWhereInput> {
  const viewer = await db.member.findUnique({
    where: { id: viewerMemberId },
    select: { chapterId: true, chapter: { select: { status: true } } },
  });
  if (!viewer) return { id: { in: [] } };
  return viewer.chapter.status === "ACTIVE" ? { chapter: { status: "ACTIVE" } } : { chapterId: viewer.chapterId };
}
