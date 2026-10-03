import { Award } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordChiefGuestForm } from "@/components/member/record-chief-guest-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";

export default async function MemberChiefGuestsBroughtPage() {
  const { member } = await requireMemberProfile();

  const guests = await db.memberChiefGuest.findMany({ where: { memberId: member.id }, orderBy: { metAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Award}
        title="Chief Guests"
        description="Business leaders and decision-makers you've invited to a chapter meeting."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordChiefGuestForm />
        </div>
        <div className="xl:col-span-2">
          <Card title={`Chief Guests brought (${guests.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["Name", "Designation", "Company", "Date"]} empty={guests.length === 0 ? "No Chief Guests recorded yet." : null}>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{g.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{g.designation ?? "—"}</td>
                  <td className={`${tdClass} text-neutral-600`}>{g.company ?? "—"}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(g.metAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
