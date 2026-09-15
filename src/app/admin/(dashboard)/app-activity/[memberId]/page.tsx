import { notFound } from "next/navigation";
import Link from "next/link";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { computeMemberScore } from "@/lib/points/score";

/**
 * Phase 20 Batch 5 — per-member drill-down, reached from the Leaderboard
 * tab's linked names or the "Jump to member" picker on /admin/app-activity.
 * Reuses computeMemberScore() — the exact same total+breakdown the member
 * portal's own /member/points page already renders — plus this one
 * member's own rows across every activity type, all on one page rather than
 * tabs (a single member's own activity is realistically small).
 */
export default async function MemberActivityDrilldownPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;

  const member = await db.member.findUnique({ where: { id: memberId }, include: { chapter: true } });
  if (!member) notFound();

  await requireChapterAccess(member.chapterId, "app_activity:view");

  const [
    { total, breakdown },
    referralsGiven,
    referralsReceived,
    thankYouSlipsGiven,
    thankYouSlipsReceived,
    oneToOnes,
    powerDatesHosted,
    powerDatesJoined,
    conclavesOrganized,
    consumers,
    chiefGuests,
    inducted,
  ] = await Promise.all([
    computeMemberScore(memberId),
    db.referral.findMany({ where: { fromMemberId: memberId }, include: { toMember: true }, orderBy: { createdAt: "desc" } }),
    db.referral.findMany({ where: { toMemberId: memberId }, include: { fromMember: true }, orderBy: { createdAt: "desc" } }),
    db.thankYouSlip.findMany({ where: { fromMemberId: memberId }, include: { toMember: true }, orderBy: { createdAt: "desc" } }),
    db.thankYouSlip.findMany({ where: { toMemberId: memberId }, include: { fromMember: true }, orderBy: { createdAt: "desc" } }),
    db.oneToOne.findMany({
      where: { OR: [{ memberId }, { withMemberId: memberId }] },
      include: { member: true, withMember: true },
      orderBy: { metAt: "desc" },
    }),
    db.powerDate.findMany({ where: { hostMemberId: memberId }, include: { participantMember: true }, orderBy: { metAt: "desc" } }),
    db.powerDate.findMany({ where: { participantMemberId: memberId }, include: { hostMember: true }, orderBy: { metAt: "desc" } }),
    db.conclave.findMany({
      where: { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }] },
      include: { participants: { include: { member: true } } },
      orderBy: { metAt: "desc" },
    }),
    db.consumer.findMany({ where: { memberId }, orderBy: { metAt: "desc" } }),
    db.memberChiefGuest.findMany({ where: { memberId }, orderBy: { metAt: "desc" } }),
    db.member.findMany({ where: { referredByMemberId: memberId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/app-activity" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to BWF App Activity
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{member.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {member.chapter.name} ·{" "}
          <Link href={`/admin/members/${member.id}`} className="underline hover:text-neutral-900">
            Edit member
          </Link>
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Overall BWF Score</p>
        <p className="mt-2 text-5xl font-semibold text-neutral-900">{total}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Activity-wise points</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Count</th>
                <th className="px-4 py-3 font-medium">Points Each</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {breakdown.map((row) => (
                <tr key={row.type}>
                  <td className="px-4 py-3 text-neutral-900">{row.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.count}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.pointsEach}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ActivitySection title="Referrals given" empty="No referrals given yet.">
        {referralsGiven.map((r) => (
          <Row key={r.id} left={r.toMember.name} right={r.createdAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Referrals received" empty="No referrals received yet.">
        {referralsReceived.map((r) => (
          <Row key={r.id} left={r.fromMember.name} right={r.createdAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Thank You Slips given" empty="No Thank You Slips given yet.">
        {thankYouSlipsGiven.map((s) => (
          <Row key={s.id} left={s.toMember.name} right={s.createdAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Thank You Slips received" empty="No Thank You Slips received yet.">
        {thankYouSlipsReceived.map((s) => (
          <Row key={s.id} left={s.fromMember.name} right={s.createdAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="One-to-Ones" empty="No One-to-Ones yet.">
        {oneToOnes.map((o) => (
          <Row key={o.id} left={o.memberId === memberId ? o.withMember.name : o.member.name} right={o.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Power Dates hosted" empty="No Power Dates hosted yet.">
        {powerDatesHosted.map((p) => (
          <Row key={p.id} left={`${p.participantMember.name} → ${p.externalContactName}`} right={p.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Power Dates joined" empty="Not brought along on a Power Date yet.">
        {powerDatesJoined.map((p) => (
          <Row key={p.id} left={`${p.hostMember.name} → ${p.externalContactName}`} right={p.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Conclaves" empty="No Conclaves yet.">
        {conclavesOrganized.map((c) => (
          <Row key={c.id} left={c.participants.map((p) => p.member.name).join(", ") || "—"} right={c.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Consumers brought" empty="No Consumers recorded yet.">
        {consumers.map((c) => (
          <Row key={c.id} left={c.company ? `${c.name} · ${c.company}` : c.name} right={c.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Chief Guests invited" empty="No Chief Guests recorded yet.">
        {chiefGuests.map((g) => (
          <Row key={g.id} left={g.company ? `${g.name} · ${g.company}` : g.name} right={g.metAt.toLocaleDateString()} />
        ))}
      </ActivitySection>

      <ActivitySection title="Members inducted" empty="No members inducted yet.">
        {inducted.map((m) => (
          <Row key={m.id} left={m.name} right={m.createdAt.toLocaleDateString()} />
        ))}
      </ActivitySection>
    </div>
  );
}

function ActivitySection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div>
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {hasChildren ? (
          <div className="divide-y divide-neutral-100">{children}</div>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">{empty}</p>
        )}
      </div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-neutral-900">{left}</span>
      <span className="text-neutral-500">{right}</span>
    </div>
  );
}
