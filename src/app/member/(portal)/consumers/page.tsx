import { ShoppingBag } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordConsumerForm } from "@/components/member/record-consumer-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";

export default async function MemberConsumersPage() {
  const { member } = await requireMemberProfile();

  const consumers = await db.consumer.findMany({ where: { memberId: member.id }, orderBy: { metAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={ShoppingBag}
        title="Consumers"
        description="End consumers — real construction requirements, not prospective members — you've brought to a chapter meeting."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordConsumerForm />
        </div>
        <div className="xl:col-span-2">
          <Card title={`Consumers brought (${consumers.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["Name", "Company", "Phone", "Date"]} empty={consumers.length === 0 ? "No consumers recorded yet." : null}>
              {consumers.map((c) => (
                <tr key={c.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>{c.name}</td>
                  <td className={`${tdClass} text-neutral-600`}>{c.company ?? "—"}</td>
                  <td className={`${tdClass} text-neutral-600`}>{c.phone ?? "—"}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(c.metAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}
