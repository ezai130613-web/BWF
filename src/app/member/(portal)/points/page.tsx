import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/member/ui";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { computeMemberScore } from "@/lib/points/score";

export default async function MemberPointsPage() {
  const { member } = await requireMemberProfile();
  const { total, breakdown } = await computeMemberScore(member.id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        icon={Trophy}
        title="My Points"
        description="Every contribution builds your BWF Score — Member Activity → Points Earned → Overall BWF Score."
      />

      <div className="flex flex-col items-center rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-8 text-center text-white shadow-md">
        <Trophy className="h-8 w-8 text-gold-400" aria-hidden />
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Overall BWF Score</p>
        <p className="mt-1 text-6xl font-semibold">{total}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Activity-wise points</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Count</th>
                <th className="px-4 py-3 font-medium">Points Each</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {breakdown.map((row) => (
                <tr key={row.type}>
                  <td className="px-4 py-3 text-neutral-900">{row.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.count}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.pointsEach}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Point values are set by BWF and may change — see your admin for the current scoring
          policy.
        </p>
      </div>
    </div>
  );
}
