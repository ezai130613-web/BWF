import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordOneToOneForm } from "@/components/member/record-one-to-one-form";

export default async function MemberOneToOnesPage() {
  const { member } = await requireMemberProfile();

  const [oneToOnes, members] = await Promise.all([
    db.oneToOne.findMany({
      where: { OR: [{ memberId: member.id }, { withMemberId: member.id }] },
      include: { member: true, withMember: true },
      orderBy: { metAt: "desc" },
    }),
    db.member.findMany({ where: { status: "ACTIVE", id: { not: member.id } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">One-to-Ones</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A dedicated meeting between two BWF members outside the regular chapter meeting — a
          chance to understand each other&rsquo;s business deeply.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Your One-to-Ones ({oneToOnes.length})</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">With</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {oneToOnes.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-neutral-900">
                    {o.memberId === member.id ? o.withMember.name : o.member.name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{o.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{o.metAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {oneToOnes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                    No One-to-Ones recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <RecordOneToOneForm members={members} />
    </div>
  );
}
