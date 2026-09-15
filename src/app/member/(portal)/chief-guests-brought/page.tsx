import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordChiefGuestForm } from "@/components/member/record-chief-guest-form";

export default async function MemberChiefGuestsBroughtPage() {
  const { member } = await requireMemberProfile();

  const guests = await db.memberChiefGuest.findMany({
    where: { memberId: member.id },
    orderBy: { metAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Chief Guests</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Chief Guests you&rsquo;ve invited to meetings — your own activity record, separate from
          BWF&rsquo;s public Chief Guests showcase.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Invited by you ({guests.length})</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Designation</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {guests.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-3 text-neutral-900">{g.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{g.designation ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{g.company ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{g.metAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {guests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    No Chief Guests recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <RecordChiefGuestForm />
    </div>
  );
}
