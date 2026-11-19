import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserPermissionKeys, requireChapterAccess, requireAdminSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { computeMemberScore, countedValue, recordedLabel } from "@/lib/points/score";
import { referralContact } from "@/lib/member-activities/record";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ExportButton } from "@/components/admin/export-button";
import { PointsAdjustmentPanel } from "@/components/admin/points-adjustment-panel";
import { SlipPointsEditor } from "@/components/admin/slip-points-editor";

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

  const member = await db.member.findUnique({ where: { id: memberId }, include: { chapter: true, category: true } });
  if (!member) notFound();

  await requireChapterAccess(member.chapterId, "app_activity:view");
  const session = await requireAdminSession();
  const canAdjust = (await getUserPermissionKeys(session.user.id)).has("points_config:manage");

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
    adjustments,
  ] = await Promise.all([
    computeMemberScore(memberId),
    db.referral.findMany({ where: { fromMemberId: memberId }, include: { toMember: true }, orderBy: { createdAt: "desc" } }),
    db.referral.findMany({ where: { toMemberId: memberId }, include: { fromMember: true }, orderBy: { createdAt: "desc" } }),
    db.thankYouSlip.findMany({ where: { fromMemberId: memberId }, include: { toMember: true }, orderBy: { createdAt: "desc" } }),
    db.thankYouSlip.findMany({
      where: { toMemberId: memberId },
      include: { fromMember: { include: { category: true, company: true } }, referral: true },
      orderBy: { createdAt: "desc" },
    }),
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
    db.pointsAdjustment.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/app-activity" className="text-sm text-neutral-500 hover:text-emerald-800">
          ← Back to BWF App Activity
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />{member.name}
          <span className="ml-2 text-lg font-normal text-neutral-500">· {member.category.name}</span>
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {member.chapter.name} ·{" "}
          <Link href={`/admin/members/${member.id}`} className="underline hover:text-emerald-800">
            Edit member
          </Link>
        </p>
        <ExportButton dataset="app-activity" params={{ memberId: member.id }} className="mt-3" />
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Overall BWF Score</p>
        <p className="mt-2 text-5xl font-semibold text-neutral-900">{total}</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Activity-wise points</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Recorded</th>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {breakdown.map((row) => (
                <tr key={row.type}>
                  <td className="px-4 py-3 text-neutral-900">{row.label}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {SECTION_ANCHOR[row.type] && row.count > 0 ? (
                      <a href={`#${SECTION_ANCHOR[row.type]}`} className="text-emerald-800 underline-offset-2 hover:underline">
                        {recordedLabel(row)} — view details
                      </a>
                    ) : (
                      recordedLabel(row)
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{row.rule}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canAdjust ? (
        <PointsAdjustmentPanel
          memberId={memberId}
          adjustments={adjustments.map((a) => ({
            id: a.id,
            points: a.points,
            reason: a.reason,
            date: a.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
          }))}
        />
      ) : null}

      <ActivitySection id="referrals" title="Referrals given" empty="No referrals given yet.">
        {referralsGiven.map((r) => (
          <Row key={r.id} left={withReferralDetails(r.toMember.name, r)} right={r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection title="Referrals received" empty="No referrals received yet.">
        {referralsReceived.map((r) => (
          <Row key={r.id} left={withReferralDetails(r.fromMember.name, r)} right={r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection title="Thank You Slips written (business received)" empty="No Thank You Slips written yet.">
        {thankYouSlipsGiven.map((s) => (
          <Row key={s.id} left={s.toMember.name} right={s.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <div id="slips-received" className="scroll-mt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Thank You Slips received (business given — earns points)</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Every slip behind the total above, so each amount can be checked.{canAdjust ? " Use Edit to change how much of a slip counts (e.g. 20% for loans / real estate)." : ""}
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          {thankYouSlipsReceived.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">No Thank You Slips received yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  {["Date", "Slip from (received business)", "What it was for", "Amount", "Counts", "Counted value"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {thankYouSlipsReceived.map((sl) => (
                  <tr key={sl.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{sl.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                    <td className="px-4 py-3 text-neutral-900">
                      {sl.fromMember.name}
                      <span className="block text-xs text-neutral-500">
                        {sl.fromMember.category.name} · {sl.fromMember.company.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {sl.description || <span className="text-neutral-300">No description</span>}
                      {sl.referral ? (
                        <span className="block text-xs text-neutral-500">From referral{sl.referral.description ? `: ${sl.referral.description}` : ""}</span>
                      ) : null}
                      {sl.pointsNote ? <span className="block text-xs text-amber-700">Points note: {sl.pointsNote}</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">{inr(sl.amountInr)}</td>
                    <td className="px-4 py-3">
                      {canAdjust ? (
                        <SlipPointsEditor slipId={sl.id} percent={sl.pointsPercent} note={sl.pointsNote} />
                      ) : (
                        <span className={sl.pointsPercent === 100 ? "text-neutral-600" : "font-medium text-amber-700"}>{sl.pointsPercent}%</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-900">{inr(countedValue(sl.amountInr, sl.pointsPercent))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 text-sm font-medium text-neutral-900">
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    Total
                  </td>
                  <td className="px-4 py-3">{inr(thankYouSlipsReceived.reduce((n, x) => n + x.amountInr, 0))}</td>
                  <td />
                  <td className="px-4 py-3">{inr(thankYouSlipsReceived.reduce((n, x) => n + countedValue(x.amountInr, x.pointsPercent), 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      <ActivitySection id="one-to-ones" title="One-to-Ones" empty="No One-to-Ones yet.">
        {oneToOnes.map((o) => (
          <Row key={o.id} left={o.memberId === memberId ? o.withMember.name : o.member.name} right={o.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection id="power-dates" title="Power Dates hosted" empty="No Power Dates hosted yet.">
        {powerDatesHosted.map((p) => (
          <Row key={p.id} left={`${p.participantMember.name} → ${p.externalContactName}`} right={p.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection title="Power Dates joined" empty="Not brought along on a Power Date yet.">
        {powerDatesJoined.map((p) => (
          <Row key={p.id} left={`${p.hostMember.name} → ${p.externalContactName}`} right={p.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection id="conclaves" title="Conclaves" empty="No Conclaves yet.">
        {conclavesOrganized.map((c) => (
          <Row key={c.id} left={c.participants.map((p) => p.member.name).join(", ") || "—"} right={c.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection id="consumers" title="Consumers brought" empty="No Consumers recorded yet.">
        {consumers.map((c) => (
          <Row key={c.id} left={c.company ? `${c.name} · ${c.company}` : c.name} right={c.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection id="chief-guests" title="Chief Guests invited" empty="No Chief Guests recorded yet.">
        {chiefGuests.map((g) => (
          <Row key={g.id} left={g.company ? `${g.name} · ${g.company}` : g.name} right={g.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>

      <ActivitySection id="inductions" title="Members inducted" empty="No members inducted yet.">
        {inducted.map((m) => (
          <Row key={m.id} left={m.name} right={m.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} />
        ))}
      </ActivitySection>
    </div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Breakdown row → the section further down the page that lists what was recorded. */
const SECTION_ANCHOR: Record<string, string> = {
  REFERRAL: "referrals",
  THANK_YOU_SLIP: "slips-received",
  ONE_TO_ONE: "one-to-ones",
  POWER_DATE: "power-dates",
  CONCLAVE: "conclaves",
  CONSUMER: "consumers",
  CHIEF_GUEST: "chief-guests",
  INDUCTION: "inductions",
};

function ActivitySection({ id, title, empty, children }: { id?: string; title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div id={id} className="scroll-mt-6">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
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

function withReferralDetails(
  name: string,
  r: { contactName: string | null; contactPhone: string | null; description: string | null },
): string {
  const contact = referralContact(r);
  return [name, contact && `Contact: ${contact}`, r.description].filter(Boolean).join(" · ");
}
