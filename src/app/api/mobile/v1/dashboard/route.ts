import { getMemberDashboard } from "@/lib/members/dashboard";
import { toMeetingSummary } from "@/lib/mobile/account";
import { formatIst } from "@/lib/ist";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { DashboardResponse } from "@/lib/mobile/contract";

export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const d = await getMemberDashboard(member);

  const body: DashboardResponse = {
    score: d.score.total,
    monthLabel: formatIst(d.now, { month: "long", year: "numeric" }),
    thisMonth: d.thisMonth,
    nextMeeting: d.nextMeeting ? toMeetingSummary(d.nextMeeting) : null,
    pendingProfileEdit: d.pendingRevision ? { submittedAt: d.pendingRevision.createdAt.toISOString() } : null,
  };
  return json(body);
});
