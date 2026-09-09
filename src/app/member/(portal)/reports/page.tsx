import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { getActivityStats, daysAgo, monthsAgo } from "@/lib/points/activity-stats";
import { formatInr } from "@/lib/format";

const PERIODS = [
  { key: "6mo", label: "6 Months" },
  { key: "12mo", label: "12 Months" },
  { key: "overall", label: "Overall" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

function periodSince(period: PeriodKey): Date | undefined {
  if (period === "6mo") return monthsAgo(6);
  if (period === "12mo") return monthsAgo(12);
  return undefined;
}

const WEEKLY_TILES = [
  { key: "oneToOnes", label: "121s", isCurrency: false },
  { key: "referralsGiven", label: "RFLs", isCurrency: false },
  { key: "businessReceivedInr", label: "Biz", isCurrency: true },
  { key: "visitors", label: "Visitors", isCurrency: false },
  { key: "inductions", label: "Inductions", isCurrency: false },
  { key: "chiefGuests", label: "Chief Guests", isCurrency: false },
  { key: "powerDates", label: "Power Dates", isCurrency: false },
  { key: "consumers", label: "Consumers", isCurrency: false },
] as const;

const REPORT_ROWS = [
  { key: "referralsReceived", label: "Referrals Received", isCurrency: false },
  { key: "referralsGiven", label: "Referrals Given", isCurrency: false },
  { key: "businessReceivedInr", label: "Business Received", isCurrency: true },
  { key: "businessGivenInr", label: "Business Given", isCurrency: true },
  { key: "oneToOnes", label: "One-to-Ones", isCurrency: false },
  { key: "visitors", label: "Visitors", isCurrency: false },
  { key: "powerDates", label: "Power Dates", isCurrency: false },
  { key: "chiefGuests", label: "Chief Guests", isCurrency: false },
  { key: "inductions", label: "Inductions", isCurrency: false },
  { key: "consumers", label: "Consumers", isCurrency: false },
] as const;

export default async function MemberReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { member } = await requireMemberProfile();
  const { period: rawPeriod } = await searchParams;
  const period: PeriodKey = PERIODS.some((p) => p.key === rawPeriod) ? (rawPeriod as PeriodKey) : "6mo";

  const [weekly, report] = await Promise.all([
    getActivityStats(member.id, daysAgo(7)),
    getActivityStats(member.id, periodSince(period)),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Your BWF activity — this week at a glance, and over a longer period below.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">This Week</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WEEKLY_TILES.map((tile) => (
            <div key={tile.key} className="rounded-lg border border-neutral-200 bg-white p-4 text-center">
              <p className="text-2xl font-semibold text-neutral-900">
                {tile.isCurrency ? formatInr(String(weekly[tile.key])) : weekly[tile.key]}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Performance Report</h2>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p.key}
                href={`/member/reports?period=${p.key}`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  period === p.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">{PERIODS.find((p) => p.key === period)?.label}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {REPORT_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3 text-neutral-900">{row.label}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.isCurrency ? formatInr(String(report[row.key])) : report[row.key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
