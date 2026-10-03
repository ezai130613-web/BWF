import { Handshake } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getPickerMembers } from "@/lib/members/picker";
import { RecordReferralForm } from "@/components/member/record-referral-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";

const TYPE_LABEL: Record<string, string> = {
  OUTSIDE: "Outside",
  SELF: "Self / Inside",
};

export default async function MemberReferralsPage() {
  const { member } = await requireMemberProfile();

  const [given, received, members] = await Promise.all([
    db.referral.findMany({
      where: { fromMemberId: member.id },
      include: { toMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.referral.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getPickerMembers(member.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Handshake}
        title="Referrals"
        description="A genuine business opportunity you pass to a fellow BWF member — Outside (from your own network) or Self/Inside (you bought from them yourself)."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordReferralForm members={members} />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card title={`Given (${given.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["To", "Type", "Date"]} empty={given.length === 0 ? "No referrals given yet." : null}>
              {given.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{r.toMember.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title={`Received (${received.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["From", "Type", "Date"]} empty={received.length === 0 ? "No referrals received yet." : null}>
              {received.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{r.fromMember.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
