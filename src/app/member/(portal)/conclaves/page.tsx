import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RecordConclaveForm } from "@/components/member/record-conclave-form";

export default async function MemberConclavesPage() {
  const { member } = await requireMemberProfile();

  const [conclaves, members] = await Promise.all([
    db.conclave.findMany({
      where: {
        OR: [{ organizedByMemberId: member.id }, { participants: { some: { memberId: member.id } } }],
      },
      include: { organizedByMember: true, participants: { include: { member: true } } },
      orderBy: { metAt: "desc" },
    }),
    db.member.findMany({ where: { status: "ACTIVE", id: { not: member.id } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Conclaves</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Three or more BWF members meeting together outside the regular chapter meeting.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Your Conclaves ({conclaves.length})</h2>
        <div className="mt-3 flex flex-col gap-3">
          {conclaves.map((c) => {
            const allMembers = [c.organizedByMember, ...c.participants.map((p) => p.member)];
            return (
              <div key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <p className="text-sm text-neutral-900">
                  {allMembers.map((m) => m.name).join(", ")}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {c.metAt.toLocaleDateString()}
                  {c.location ? ` · ${c.location}` : ""}
                  {c.organizedByMemberId === member.id ? " · Organized by you" : ""}
                </p>
                {c.notes ? <p className="mt-2 text-sm text-neutral-600">{c.notes}</p> : null}
              </div>
            );
          })}
          {conclaves.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
              No Conclaves recorded yet.
            </div>
          ) : null}
        </div>
      </div>

      <RecordConclaveForm members={members} />
    </div>
  );
}
