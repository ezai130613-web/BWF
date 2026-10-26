import { daysAgo, getActivityStats, monthsAgo } from "@/lib/points/activity-stats";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { ReportPeriod, ReportsResponse } from "@/lib/mobile/contract";

const SINCE: Record<ReportPeriod, () => Date | undefined> = {
  week: () => daysAgo(7),
  "6mo": () => monthsAgo(6),
  "12mo": () => monthsAgo(12),
  overall: () => undefined,
};

/** Same activity counts as /member/reports: this week, 6 months, 12 months, or overall. */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const raw = new URL(request.url).searchParams.get("period");
  const period: ReportPeriod = raw && raw in SINCE ? (raw as ReportPeriod) : "6mo";
  const body: ReportsResponse = { period, stats: await getActivityStats(member.id, SINCE[period]()) };
  return json(body);
});
