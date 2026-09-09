import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordReferralForm } from "@/components/member/record-referral-form";

const TYPE_LABEL: Record<string, string> = {
  OUTSIDE: "Outside Referral",
  SELF: "Self / Inside Referral",
};

export default async function MemberReferralsPage() {
  const { member } = await requireMemberProfile();

  const [given, received, members] = await Promise.all([
    db.referral.findMany({
      where: { fromMemberId: member.id },
      include: { toMember: true },
      orderBy: { createdAt: "desc" },
    }),
    db.referral.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: true },
      orderBy: { createdAt: "desc" },
    }),
    db.member.findMany({ where: { status: "ACTIVE", id: { not: member.id } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Referrals</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A referral is a genuine business opportunity you pass to a fellow BWF member — Outside
          (from your own network) or Self/Inside (you bought from them yourself).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Given ({given.length})</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {given.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-neutral-900">{r.toMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{TYPE_LABEL[r.type]}</td>
                    <td className="px-4 py-3 text-neutral-500">{r.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {given.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No referrals given yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Received ({received.length})</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {received.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-neutral-900">{r.fromMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{TYPE_LABEL[r.type]}</td>
                    <td className="px-4 py-3 text-neutral-500">{r.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {received.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No referrals received yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RecordReferralForm members={members} />
    </div>
  );
}
