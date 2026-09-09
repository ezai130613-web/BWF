import { requireMemberProfile } from "@/lib/auth/rbac";
import { computeMemberScore } from "@/lib/points/score";

export default async function MemberPointsPage() {
  const { member } = await requireMemberProfile();
  const { total, breakdown } = await computeMemberScore(member.id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Points & Score</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Every contribution builds your BWF Score — Member Activity → Points Earned → Overall BWF
          Score.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Overall BWF Score</p>
        <p className="mt-2 text-5xl font-semibold text-neutral-900">{total}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Activity-wise points</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
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
