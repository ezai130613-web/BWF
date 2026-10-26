import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/member/ui";
import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { DETAILED_REPORT_TABS as TABS, isDetailedReportTab, loadDetailedReport } from "@/lib/points/detailed-reports";

export default async function DetailedReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { member } = await requireMemberProfile();
  const { tab: rawTab } = await searchParams;
  const tab = isDetailedReportTab(rawTab) ? rawTab : "referrals-given";

  const { columns, rows } = await loadDetailedReport(tab, member.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={FileBarChart} title="Detailed Reports" description="Go beyond the numbers — exactly who, what, and when." />

      <nav className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/member/detailed-reports?tab=${t.key}`}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              tab === t.key ? "bg-emerald-800 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-3 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-3 text-neutral-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-400">
                  Nothing here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
