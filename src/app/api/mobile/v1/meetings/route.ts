import { db } from "@/lib/db";
import { toMeetingSummary } from "@/lib/mobile/account";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { MeetingsResponse } from "@/lib/mobile/contract";

/** The member's chapter meetings — same queries as /member/meetings. */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const now = new Date();

  const [upcoming, recent] = await Promise.all([
    db.meeting.findMany({
      where: { chapterId: member.chapterId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { chiefGuest: { select: { name: true, designation: true, company: true } } },
      orderBy: { startsAt: "asc" },
      take: 12,
    }),
    db.meeting.findMany({
      where: { chapterId: member.chapterId, startsAt: { lt: now } },
      select: { id: true, title: true, startsAt: true, status: true },
      orderBy: { startsAt: "desc" },
      take: 6,
    }),
  ]);

  const body: MeetingsResponse = {
    upcoming: upcoming.map(toMeetingSummary),
    recent: recent.map((m) => ({ id: m.id, title: m.title, startsAt: m.startsAt.toISOString(), status: m.status })),
  };
  return json(body);
});
