import { Users } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getPickerMembers } from "@/lib/members/picker";
import { RecordOneToOneForm } from "@/components/member/record-one-to-one-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";

export default async function MemberOneToOnesPage() {
  const { member } = await requireMemberProfile();

  const [oneToOnes, members] = await Promise.all([
    db.oneToOne.findMany({
      where: { OR: [{ memberId: member.id }, { withMemberId: member.id }] },
      include: { member: { select: { id: true, name: true } }, withMember: { select: { id: true, name: true } } },
      orderBy: { metAt: "desc" },
    }),
    getPickerMembers(member.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="One-to-Ones"
        description="A dedicated meeting between two BWF members outside the regular chapter meeting — a chance to understand each other's business deeply. Recorded once, it counts for both of you."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordOneToOneForm members={members} />
        </div>
        <div className="xl:col-span-2">
          <Card title={`Your One-to-Ones (${oneToOnes.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["With", "Notes", "Date"]} empty={oneToOnes.length === 0 ? "No One-to-Ones recorded yet." : null}>
              {oneToOnes.map((o) => {
                const other = o.memberId === member.id ? o.withMember : o.member;
                return (
                  <tr key={o.id}>
                    <td className={`${tdClass} font-medium text-neutral-900`}>{other.name}</td>
                    <td className={`${tdClass} text-neutral-600`}>{o.notes ?? "—"}</td>
                    <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(o.metAt)}</td>
                  </tr>
                );
              })}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
