import { Receipt } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";
import { getPickerMembers } from "@/lib/members/picker";
import { RecordThankYouSlipForm } from "@/components/member/record-thank-you-slip-form";
import { Card, DataTable, PageHeader, StatTile, formatShortDate, tdClass } from "@/components/member/ui";

export default async function MemberThankYouSlipsPage() {
  const { member } = await requireMemberProfile();

  const [given, received, members, receivedReferrals] = await Promise.all([
    db.thankYouSlip.findMany({
      where: { fromMemberId: member.id },
      include: { toMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.thankYouSlip.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getPickerMembers(member.id),
    db.referral.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalGiven = given.reduce((s, x) => s + x.amountInr, 0);
  const totalReceived = received.reduce((s, x) => s + x.amountInr, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Receipt}
        title="Thank You Slips"
        description="Records business you actually received through a BWF referral — Referral = opportunity given, Thank You Slip = business successfully generated."
      />
      <div className="grid grid-cols-2 gap-3 md:max-w-xl">
        <StatTile label="Business you received" value={formatInr(String(totalGiven)) ?? "₹0"} hint={`${given.length} slip(s) you recorded`} />
        <StatTile label="Business you generated" value={formatInr(String(totalReceived)) ?? "₹0"} hint={`${received.length} slip(s) thanking you`} />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordThankYouSlipForm
            members={members}
            receivedReferrals={receivedReferrals.map((r) => ({ id: r.id, fromMemberName: r.fromMember.name, createdAt: r.createdAt }))}
          />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card title={`Given (${given.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["To", "Amount", "Date"]} empty={given.length === 0 ? "No Thank You Slips given yet." : null}>
              {given.map((s) => (
                <tr key={s.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{s.toMember.name}</td>
                  <td className={`${tdClass} text-neutral-700`}>{formatInr(String(s.amountInr))}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(s.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title={`Received (${received.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["From", "Amount", "Date"]} empty={received.length === 0 ? "No Thank You Slips received yet." : null}>
              {received.map((s) => (
                <tr key={s.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{s.fromMember.name}</td>
                  <td className={`${tdClass} text-neutral-700`}>{formatInr(String(s.amountInr))}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(s.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
