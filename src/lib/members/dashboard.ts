import { db } from "@/lib/db";
import { computeMemberScore } from "@/lib/points/score";
import { getActivityStats } from "@/lib/points/activity-stats";
import { istParts, istToUtc } from "@/lib/ist";
import type { Member } from "@/generated/prisma/client";

/** Member dashboard data — shared by the portal home page and the app's dashboard endpoint. */
export async function getMemberDashboard(member: Pick<Member, "id" | "chapterId" | "categoryId" | "companyId">) {
  const now = new Date();
  const { year, month } = istParts(now);
  const monthStart = istToUtc(year, month, 1);

  const [chapter, category, company, pendingRevision, nextMeeting] = await Promise.all([
    db.chapter.findUniqueOrThrow({ where: { id: member.chapterId } }),
    db.category.findUniqueOrThrow({ where: { id: member.categoryId } }),
    db.company.findUniqueOrThrow({ where: { id: member.companyId } }),
    db.memberProfileRevision.findFirst({ where: { memberId: member.id, status: "PENDING" } }),
    db.meeting.findFirst({
      where: { chapterId: member.chapterId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { chiefGuest: { select: { name: true, designation: true, company: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  // Sequential on purpose: each of these fans out ~10 queries, and the app's
  // connection pool is small.
  const score = await computeMemberScore(member.id);
  const thisMonth = await getActivityStats(member.id, monthStart);

  return { now, chapter, category, company, pendingRevision, nextMeeting, score, thisMonth };
}
