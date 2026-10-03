import { Rocket } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getPickerMembers } from "@/lib/members/picker";
import { RecordPowerDateForm } from "@/components/member/record-power-date-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";

function contact(p: { externalContactName: string; externalContactCompany: string | null }) {
  return p.externalContactCompany ? `${p.externalContactName} (${p.externalContactCompany})` : p.externalContactName;
}

export default async function MemberPowerDatesPage() {
  const { member } = await requireMemberProfile();

  const [hosted, joined, members] = await Promise.all([
    db.powerDate.findMany({
      where: { hostMemberId: member.id },
      include: { participantMember: { select: { name: true } } },
      orderBy: { metAt: "desc" },
    }),
    db.powerDate.findMany({
      where: { participantMemberId: member.id },
      include: { hostMember: { select: { name: true } } },
      orderBy: { metAt: "desc" },
    }),
    getPickerMembers(member.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Rocket}
        title="Power Dates"
        description="A BWF member takes one or more fellow members to meet their own external business connection — opening doors for each other."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordPowerDateForm members={members} />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card title={`You hosted (${hosted.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["Brought", "External contact", "Date"]} empty={hosted.length === 0 ? "No Power Dates hosted yet." : null}>
              {hosted.map((p) => (
                <tr key={p.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{p.participantMember.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{contact(p)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(p.metAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title={`You joined (${joined.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["Host", "External contact", "Date"]} empty={joined.length === 0 ? "No Power Dates joined yet." : null}>
              {joined.map((p) => (
                <tr key={p.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{p.hostMember.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{contact(p)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(p.metAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
