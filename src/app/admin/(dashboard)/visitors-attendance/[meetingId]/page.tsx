import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CorrectVisitorAttendanceForm } from "@/components/admin/correct-visitor-attendance-form";

const SOURCE_LABELS: Record<string, string> = {
  INVITED_BY_MEMBER: "Invited by member",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  GOOGLE_SEARCH: "Google Search",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  OTHER: "Other",
};

export default async function VisitorsAttendanceMeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<{ q?: string; category?: string; invitingMemberId?: string; source?: string }>;
}) {
  const { meetingId } = await params;
  const filters = await searchParams;

  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
  if (!meeting) notFound();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  const [allAttendances, invitingMembers] = await Promise.all([
    db.visitorAttendance.findMany({
      where: { meetingId },
      include: { visitorProfile: true, invitingMember: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.member.findMany({ where: { chapterId: meeting.chapterId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalRegistered = allAttendances.length;
  const checkedIn = allAttendances.filter((a) => a.status === "PRESENT").length;
  const notCheckedIn = allAttendances.filter((a) => a.status === "ABSENT").length;
  const memberInvited = allAttendances.filter((a) => a.source === "INVITED_BY_MEMBER").length;
  const otherSource = totalRegistered - memberInvited;

  const attendances = allAttendances.filter((a) => {
    if (filters.q && !a.visitorProfile.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.category && !(a.visitorProfile.businessCategory ?? "").toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.invitingMemberId && a.invitingMemberId !== filters.invitingMemberId) return false;
    if (filters.source && a.source !== filters.source) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/visitors-attendance" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to Visitors Attendance
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="text-sm text-neutral-600">
          {meeting.chapter.name} · {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Registered" value={totalRegistered} />
        <StatCard label="Checked In" value={checkedIn} />
        <StatCard label="Not Checked In" value={notCheckedIn} />
        <StatCard label="Member-Invited" value={memberInvited} />
        <StatCard label="Other Source" value={otherSource} />
      </div>

      <form action={`/admin/visitors-attendance/${meetingId}`} method="GET" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Visitor
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by name…"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Category
          <input
            name="category"
            defaultValue={filters.category}
            placeholder="Business category…"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Inviting member
          <select name="invitingMemberId" defaultValue={filters.invitingMemberId ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {invitingMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Source
          <select name="source" defaultValue={filters.source ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-neutral-400">
          Apply filters
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Visitor</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Inviter / Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Check-in time</th>
              <th className="px-4 py-3 font-medium">Correct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {attendances.map((a, i) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-neutral-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{a.visitorProfile.name}</td>
                <td className="px-4 py-3 text-neutral-600">{a.visitorProfile.phone}</td>
                <td className="px-4 py-3 text-neutral-600">{a.visitorProfile.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{a.visitorProfile.businessCategory ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {a.source === "INVITED_BY_MEMBER" ? a.invitingMember?.name ?? "—" : SOURCE_LABELS[a.source]}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} corrected={Boolean(a.correctedByUserId)} />
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {a.checkedInAt ? a.checkedInAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </td>
                <td className="px-4 py-3">
                  <CorrectVisitorAttendanceForm visitorAttendanceId={a.id} currentStatus={a.status} />
                </td>
              </tr>
            ))}
            {attendances.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                  {allAttendances.length === 0 ? "No visitor check-ins for this meeting yet." : "No visitors match these filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status, corrected }: { status: string; corrected: boolean }) {
  const styles: Record<string, string> = {
    PRESENT: "bg-emerald-50 text-emerald-700",
    ABSENT: "bg-red-50 text-red-700",
  };
  const labels: Record<string, string> = { PRESENT: "Present", ABSENT: "Absent" };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
      {corrected ? " (corrected)" : ""}
    </span>
  );
}

