import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordConsumerForm } from "@/components/member/record-consumer-form";

export default async function MemberConsumersPage() {
  const { member } = await requireMemberProfile();

  const consumers = await db.consumer.findMany({
    where: { memberId: member.id },
    orderBy: { metAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Consumers</h1>
        <p className="mt-1 text-sm text-neutral-600">
          End consumers — real construction requirements, not prospective members — you&rsquo;ve
          brought to meetings.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Brought by you ({consumers.length})</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {consumers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-neutral-900">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.metAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {consumers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    No Consumers recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <RecordConsumerForm />
    </div>
  );
}
