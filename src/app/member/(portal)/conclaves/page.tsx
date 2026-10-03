import { UsersRound } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getPickerMembers } from "@/lib/members/picker";
import { RecordConclaveForm } from "@/components/member/record-conclave-form";
import { Card, EmptyState, PageHeader, formatShortDate } from "@/components/member/ui";

export default async function MemberConclavesPage() {
  const { member } = await requireMemberProfile();

  const [conclaves, members] = await Promise.all([
    db.conclave.findMany({
      where: {
        OR: [{ organizedByMemberId: member.id }, { participants: { some: { memberId: member.id } } }],
      },
      include: {
        organizedByMember: { select: { name: true } },
        participants: { include: { member: { select: { name: true } } } },
      },
      orderBy: { metAt: "desc" },
    }),
    getPickerMembers(member.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={UsersRound}
        title="Conclaves"
        description="Three or more BWF members meeting together outside the regular chapter meeting."
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordConclaveForm members={members} />
        </div>
        <div className="xl:col-span-2">
          <Card title={`Your Conclaves (${conclaves.length})`}>
            {conclaves.length === 0 ? (
              <EmptyState message="No Conclaves recorded yet." />
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {conclaves.map((c) => (
                  <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {[c.organizedByMember, ...c.participants.map((p) => p.member)].map((m) => m.name).join(", ")}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatShortDate(c.metAt)}
                      {c.location ? ` · ${c.location}` : ""}
                      {c.organizedByMemberId === member.id ? " · Organised by you" : ""}
                    </p>
                    {c.notes ? <p className="mt-1 text-sm text-neutral-600">{c.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
