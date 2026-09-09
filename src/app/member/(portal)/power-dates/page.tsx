import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordPowerDateForm } from "@/components/member/record-power-date-form";

export default async function MemberPowerDatesPage() {
  const { member } = await requireMemberProfile();

  const [hosted, joined, members] = await Promise.all([
    db.powerDate.findMany({
      where: { hostMemberId: member.id },
      include: { participantMember: true },
      orderBy: { metAt: "desc" },
    }),
    db.powerDate.findMany({
      where: { participantMemberId: member.id },
      include: { hostMember: true },
      orderBy: { metAt: "desc" },
    }),
    db.member.findMany({ where: { status: "ACTIVE", id: { not: member.id } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Power Dates</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A BWF member takes one or more fellow members to meet their own external business
          connection.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Hosted by you ({hosted.length})</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Fellow Member</th>
                  <th className="px-4 py-3 font-medium">External Contact</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {hosted.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-neutral-900">{p.participantMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {p.externalContactName}
                      {p.externalContactCompany ? ` · ${p.externalContactCompany}` : ""}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{p.metAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {hosted.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No Power Dates hosted yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-neutral-900">You were brought along ({joined.length})</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Host</th>
                  <th className="px-4 py-3 font-medium">External Contact</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {joined.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-neutral-900">{p.hostMember.name}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {p.externalContactName}
                      {p.externalContactCompany ? ` · ${p.externalContactCompany}` : ""}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{p.metAt.toLocaleDateString()}</td>
                  </tr>
                ))}
                {joined.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                      No Power Dates yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RecordPowerDateForm members={members} />
    </div>
  );
}
