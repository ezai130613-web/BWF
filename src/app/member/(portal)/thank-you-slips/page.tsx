import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";
import { RecordThankYouSlipForm } from "@/components/member/record-thank-you-slip-form";

export default async function MemberThankYouSlipsPage() {
  const { member } = await requireMemberProfile();

  const [given, received, members, receivedReferrals] = await Promise.all([
    db.thankYouSlip.findMany({
      where: { fromMemberId: member.id },
      include: { toMember: true },
      orderBy: { createdAt: "desc" },
    }),
    db.thankYouSlip.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: true },
      orderBy: { createdAt: "desc" },
    }),
    db.member.findMany({ where: { status: "ACTIVE", id: { not: member.id } }, orderBy: { name: "asc" } }),
    db.referral.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Thank You Slips</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A Thank You Slip records business you actually received through a BWF referral — Referral
          = opportunity given, Thank You Slip = business successfully generated.
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
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {given.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-neutral-900">{s.toMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatInr(String(s.amountInr))}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {given.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No Thank You Slips given yet.
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
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {received.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-neutral-900">{s.fromMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatInr(String(s.amountInr))}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {received.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No Thank You Slips received yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RecordThankYouSlipForm
        members={members}
        receivedReferrals={receivedReferrals.map((r) => ({
          id: r.id,
          fromMemberName: r.fromMember.name,
          createdAt: r.createdAt,
        }))}
      />
    </div>
  );
}
