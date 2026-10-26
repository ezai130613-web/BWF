import { DETAILED_REPORT_TABS, isDetailedReportTab, loadDetailedReport } from "@/lib/points/detailed-reports";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { DetailedReportResponse } from "@/lib/mobile/contract";

export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const raw = new URL(request.url).searchParams.get("tab") ?? undefined;
  const tab = isDetailedReportTab(raw) ? raw : "referrals-given";
  const { columns, rows } = await loadDetailedReport(tab, member.id);
  const body: DetailedReportResponse = {
    tabs: DETAILED_REPORT_TABS.map((t) => ({ key: t.key, label: t.label })),
    tab,
    columns: columns.map((c) => c.header),
    rows,
  };
  return json(body);
});
