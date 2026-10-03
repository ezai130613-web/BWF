import { notFound } from "next/navigation";
import { getUserPermissionKeys, requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditMeetingForm } from "@/components/admin/edit-meeting-form";
import { ReminderBadge } from "@/components/admin/reminder-badge";
import { formatIstDateTime } from "@/lib/ist";
import { getReminderRecipients, reminderScheduledFor } from "@/lib/meetings/reminders";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const meeting = await db.meeting.findUnique({ where: { id }, include: { chapter: true } });
  if (!meeting) notFound();

  await requireChapterAccess(meeting.chapterId, "meetings:manage");

  const session = await requireAdminSession();
  const permissions = await getUserPermissionKeys(session.user.id);
  const canManageChiefGuests = permissions.has("chief_guests:manage");

  const [visitors, chiefGuests, reminderLogs, recipients, activeMemberCount] = await Promise.all([
    db.visitor.findMany({
      where: { meetingId: id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.chiefGuest.findMany({
      where: { chapterId: meeting.chapterId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.meetingReminderLog.findMany({
      where: { meetingId: id },
      include: { member: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getReminderRecipients(meeting.chapterId),
    db.member.count({ where: { chapterId: meeting.chapterId, status: "ACTIVE" } }),
  ]);
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {meeting.chapter.name} · {formatIstDateTime(meeting.startsAt)} IST · Chief Guest:{" "}
          {meeting.chiefGuestId ? chiefGuests.find((g) => g.id === meeting.chiefGuestId)?.name ?? "Assigned" : "Not Assigned"}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Member reminder email</h2>
          <ReminderBadge
            enabled={meeting.reminderEnabled}
            status={meeting.reminderStatus}
            scheduledFor={formatIstDateTime(reminderScheduledFor(meeting.startsAt))}
            meetingStatus={meeting.status}
            isPast={meeting.startsAt < now}
          />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">Reminder</dt>
            <dd className="text-neutral-900">{meeting.reminderEnabled ? "ON" : "OFF"} — toggle in the form below</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Scheduled for</dt>
            <dd className="text-neutral-900">{formatIstDateTime(reminderScheduledFor(meeting.startsAt))} IST</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Recipients (right now)</dt>
            <dd className="text-neutral-900">
              {recipients.length} of {activeMemberCount} active members
              {activeMemberCount > recipients.length ? ` · ${activeMemberCount - recipients.length} skipped (no valid email)` : ""}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral-500">
          The email always uses the latest saved meeting details. Changing the date resets the reminder so the new date
          gets its own.
          {meeting.reminderProcessedAt && meeting.reminderStatus !== "SENDING"
            ? ` Processed ${formatIstDateTime(meeting.reminderProcessedAt)} IST.`
            : ""}
        </p>
        {reminderLogs.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-neutral-700">
              Delivery log ({reminderLogs.filter((l) => l.status === "SENT").length} sent,{" "}
              {reminderLogs.filter((l) => l.status === "FAILED").length} failed)
            </summary>
            <div className="mt-2 max-h-72 overflow-auto rounded border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-neutral-50 uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {reminderLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-1.5 text-neutral-900">{l.member?.name ?? "—"}</td>
                      <td className="px-3 py-1.5 text-neutral-600">{l.email}</td>
                      <td className={`px-3 py-1.5 ${l.status === "SENT" ? "text-emerald-700" : "text-red-700"}`} title={l.error ?? undefined}>
                        {l.status === "SENT" ? "Sent" : `Failed${l.error ? ` — ${l.error.slice(0, 80)}` : ""}`}
                      </td>
                      <td className="px-3 py-1.5 text-neutral-500">{formatIstDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </div>

      <EditMeetingForm meeting={meeting} chiefGuests={chiefGuests} canManageChiefGuests={canManageChiefGuests} />

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Registered visitors ({visitors.length})</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visitors.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 text-neutral-900">{v.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.phone}</td>
                <td className="px-4 py-3 text-neutral-600">{v.category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.status.replace(/_/g, " ")}</td>
              </tr>
            ))}
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No registrations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
