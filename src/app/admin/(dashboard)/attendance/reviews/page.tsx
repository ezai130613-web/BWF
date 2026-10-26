import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatIst, formatIstDateTime } from "@/lib/ist";
import { getAbsenceTrackingFrom, getMeetingsAwaitingManualClose, REVIEW_STREAK, WARNING_STREAK } from "@/lib/attendance/absences";
import { isWhatsAppEnabled } from "@/lib/whatsapp";
import { AbsenceReviewActions } from "@/components/admin/absence-review-actions";
import { AdminPageIcon } from "@/components/admin/page-icon";
import type { Prisma } from "@/generated/prisma/client";

const DECISION_LABELS: Record<string, { label: string; className: string }> = {
  COURTESY_GRANTED: { label: "Courtesy extended", className: "bg-emerald-50 text-emerald-700" },
  MEMBER_REMOVED: { label: "Member removed", className: "bg-red-50 text-red-700" },
  DISMISSED: { label: "Closed automatically", className: "bg-neutral-100 text-neutral-600" },
};

const CHANNEL_STYLES: Record<string, string> = {
  SENT: "text-emerald-700",
  FAILED: "text-red-700",
  SKIPPED: "text-neutral-400",
  PENDING: "text-amber-700",
};

function shortDate(date: Date) {
  return formatIst(date, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Phase 39 — consecutive absences. Members with 3+ absences in a row wait
 * here for an admin decision: extend courtesy (e.g. medical approval) or
 * remove the member. Also lists the automatic 2-in-a-row warnings and any
 * meeting that ended with no check-ins (never auto-closed).
 */
export default async function AbsenceReviewsPage({ searchParams }: { searchParams: Promise<{ decided?: string }> }) {
  const scope = await getChapterScope("attendance:manage");
  const { decided: decidedId } = await searchParams;
  const memberScope: Prisma.MemberWhereInput = scope === "ALL" ? {} : { chapterId: scope };

  const [trackingFrom, openReviews, decided, warnings, awaitingClose] = await Promise.all([
    getAbsenceTrackingFrom(),
    db.absenceReview.findMany({
      where: { status: "OPEN", member: memberScope },
      include: { member: { include: { chapter: true, category: true } } },
      orderBy: [{ streak: "desc" }, { createdAt: "asc" }],
    }),
    db.absenceReview.findMany({
      where: { status: { not: "OPEN" }, member: memberScope },
      include: { member: { include: { chapter: true } }, decidedBy: { select: { name: true } } },
      orderBy: { decidedAt: "desc" },
      take: 50,
    }),
    db.absenceWarning.findMany({
      where: { member: memberScope },
      include: { member: { include: { chapter: true } }, meeting: { select: { title: true, startsAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    getMeetingsAwaitingManualClose(scope === "ALL" ? undefined : scope),
  ]);

  const meetingIds = [...new Set(openReviews.flatMap((r) => (Array.isArray(r.absentMeetingIds) ? (r.absentMeetingIds as string[]) : [])))];
  const meetings = await db.meeting.findMany({ where: { id: { in: meetingIds } }, select: { id: true, startsAt: true } });
  const meetingDate = new Map(meetings.map((m) => [m.id, m.startsAt]));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const justDecided = decidedId ? decided.find((r) => r.id === decidedId) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Absence Reviews</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Members who don&rsquo;t check in with the meeting QR code are marked Absent once the meeting is over.{" "}
            {WARNING_STREAK} absences in a row send the member an automatic warning by email
            {isWhatsAppEnabled() ? " and WhatsApp" : " (WhatsApp too, once it's configured)"}. {REVIEW_STREAK} in a row bring
            them here for a decision.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            {trackingFrom
              ? `Counting meetings from ${formatIstDateTime(trackingFrom)} IST.`
              : "Automatic absence tracking is switched off (Settings)."}
          </p>
        </div>
        <Link href="/admin/attendance" className="text-sm text-neutral-600 underline hover:text-emerald-800">
          ← Attendance
        </Link>
      </div>

      {justDecided ? (
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          {justDecided.status === "MEMBER_REMOVED"
            ? `${justDecided.member.name} has been removed — deactivated and signed out everywhere. Restore them from Members if needed.`
            : `Courtesy extended for ${justDecided.member.name}${justDecided.excusedUntil ? ` — absences up to ${shortDate(justDecided.excusedUntil)} won't count` : ""}.`}
        </p>
      ) : null}

      {awaitingClose.length > 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-950">Meetings with no check-ins</h2>
          <p className="mt-1 text-sm text-amber-900">
            These meetings ended without a single QR check-in, so nobody was marked absent automatically. If the meeting
            took place, mark attendance and close it by hand.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {awaitingClose.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/attendance/${m.id}`} className="font-medium text-amber-950 underline">
                  {m.title}
                </Link>{" "}
                <span className="text-amber-900">
                  · {m.chapter.name} · {shortDate(m.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Waiting for a decision ({openReviews.length})</h2>
        {openReviews.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200/80 bg-white p-6 text-center text-sm text-neutral-400 shadow-sm">
            No members with {REVIEW_STREAK} absences in a row.
          </p>
        ) : (
          openReviews.map((r) => {
            const ids = Array.isArray(r.absentMeetingIds) ? (r.absentMeetingIds as string[]) : [];
            const dates = ids
              .map((id) => meetingDate.get(id))
              .filter((d): d is Date => Boolean(d))
              .sort((a, b) => a.getTime() - b.getTime())
              .map(shortDate);
            return (
              <article key={r.id} className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900">
                    <Link href={`/admin/members/${r.memberId}`} className="hover:underline">
                      {r.member.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {r.member.category.name} · {r.member.chapter.name}
                    {r.member.phone ? ` · ${r.member.phone}` : ""}
                  </p>
                  <p className="mt-2 text-sm font-medium text-red-700">
                    {r.streak} meetings missed in a row: {dates.join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Flagged {formatIstDateTime(r.createdAt)} IST</p>
                </div>
                <div className="lg:w-[26rem] lg:flex-shrink-0">
                  <AbsenceReviewActions reviewId={r.id} memberName={r.member.name} today={today} />
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Automatic warnings sent ({WARNING_STREAK} in a row)</h2>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Chapter</th>
                <th className="px-4 py-3 font-medium">After meeting</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">WhatsApp</th>
                <th className="px-4 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {warnings.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-neutral-900">{w.member.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{w.member.chapter.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{shortDate(w.meeting.startsAt)}</td>
                  <td className={`px-4 py-3 ${CHANNEL_STYLES[w.emailStatus] ?? ""}`} title={w.emailError ?? undefined}>
                    {w.emailStatus.toLowerCase()}
                  </td>
                  <td className={`px-4 py-3 ${CHANNEL_STYLES[w.whatsappStatus] ?? ""}`} title={w.whatsappError ?? undefined}>
                    {w.whatsappStatus.toLowerCase()}
                    {w.whatsappStatus === "SKIPPED" && w.whatsappError ? <span className="text-neutral-400"> — {w.whatsappError}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{formatIstDateTime(w.createdAt)}</td>
                </tr>
              ))}
              {warnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No warnings sent yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Past decisions</h2>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Absences</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {decided.map((r) => {
                const label = DECISION_LABELS[r.status];
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-neutral-900">
                      <Link href={`/admin/members/${r.memberId}`} className="hover:underline">
                        {r.member.name}
                      </Link>
                      <span className="block text-xs text-neutral-500">{r.member.chapter.name}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{r.streak}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label?.className ?? ""}`}>{label?.label ?? r.status}</span>
                      {r.status === "COURTESY_GRANTED" && r.excusedUntil ? (
                        <span className="block text-xs text-neutral-500">excused up to {shortDate(r.excusedUntil)}</span>
                      ) : null}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-neutral-600">{r.decisionNote ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{r.decidedBy?.name ?? (r.status === "DISMISSED" ? "System" : "—")}</td>
                    <td className="px-4 py-3 text-neutral-500">{r.decidedAt ? formatIstDateTime(r.decidedAt) : "—"}</td>
                  </tr>
                );
              })}
              {decided.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    No decisions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
