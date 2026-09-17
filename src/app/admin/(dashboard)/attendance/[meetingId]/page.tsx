import Link from "next/link";
import { notFound } from "next/navigation";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CorrectAttendanceForm } from "@/components/admin/correct-attendance-form";
import { CloseAttendanceButton } from "@/components/admin/close-attendance-button";

export default async function AttendanceMeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;

  const meeting = await db.meeting.findUnique({ where: { id: meetingId }, include: { chapter: true } });
  if (!meeting) notFound();
  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  const [members, attendances] = await Promise.all([
    db.member.findMany({
      where: { chapterId: meeting.chapterId, status: "ACTIVE" },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    db.attendance.findMany({ where: { meetingId } }),
  ]);

  const attendanceByMember = new Map(attendances.map((a) => [a.memberId, a]));

  const present = attendances.filter((a) => a.status === "PRESENT").length;
  const absent = attendances.filter((a) => a.status === "ABSENT").length;
  const totalExpected = members.length;
  const percentage = totalExpected > 0 ? Math.round((present / totalExpected) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/attendance" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to Attendance Management
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{meeting.title}</h1>
            <p className="text-sm text-neutral-600">
              {meeting.chapter.name} ·{" "}
              {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <CloseAttendanceButton meetingId={meeting.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Expected" value={totalExpected} />
        <StatCard label="Present" value={present} />
        <StatCard label="Absent" value={absent} />
        <StatCard label="Attendance %" value={`${percentage}%`} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Check-in time</th>
              <th className="px-4 py-3 font-medium">Correct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.map((member, i) => {
              const attendance = attendanceByMember.get(member.id);
              const status = attendance?.status ?? "NOT_CHECKED_IN";
              return (
                <tr key={member.id}>
                  <td className="px-4 py-3 text-neutral-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{member.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{member.category.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} corrected={Boolean(attendance?.correctedByUserId)} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {attendance?.checkedInAt ? attendance.checkedInAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <CorrectAttendanceForm meetingId={meeting.id} memberId={member.id} currentStatus={attendance?.status ?? null} />
                  </td>
                </tr>
              );
            })}
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No active members in this chapter.
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
    NOT_CHECKED_IN: "bg-neutral-100 text-neutral-500",
  };
  const labels: Record<string, string> = {
    PRESENT: "Present",
    ABSENT: "Absent",
    NOT_CHECKED_IN: "Not Checked In",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
      {corrected ? " (corrected)" : ""}
    </span>
  );
}
