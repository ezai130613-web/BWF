import Link from "next/link";
import { getChapterScope, getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateMeetingForm } from "@/components/admin/create-meeting-form";
import { ReminderBadge } from "@/components/admin/reminder-badge";
import { formatIstDateTime } from "@/lib/ist";
import { reminderScheduledFor } from "@/lib/meetings/reminders";

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-neutral-100 text-neutral-500",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string }>;
}) {
  const scope = await getChapterScope("meetings:manage");
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };
  // Roster Sheets' "+ Create a new meeting" link (src/app/admin/(dashboard)/roster/page.tsx)
  // passes ?chapterId= so the create form below starts pre-scoped to that
  // chapter instead of asking the admin to pick it again.
  const { chapterId: preselectChapterId } = await searchParams;

  const session = await requireAdminSession();
  const now = new Date();
  const permissions = await getUserPermissionKeys(session.user.id);
  const canManageChiefGuests = permissions.has("chief_guests:manage");

  const [meetings, chapters, chiefGuests] = await Promise.all([
    db.meeting.findMany({
      where: chapterFilter,
      include: { chapter: true, _count: { select: { visitors: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.chapter.findMany({ where: scope === "ALL" ? {} : { id: scope }, orderBy: { name: "asc" } }),
    db.chiefGuest.findMany({
      where: scope === "ALL" ? {} : { chapterId: scope },
      select: { id: true, name: true, chapterId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Meetings</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Chapter meetings that visitors can register to attend online (brief §21/§23). Times are IST.
          </p>
        </div>
        <Link
          href="/admin/meetings/generate"
          className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create Next Month&rsquo;s Meetings
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Visitors</th>
              <th className="px-4 py-3 font-medium">Member reminder</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {meetings.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-neutral-900">{m.title}</td>
                <td className="px-4 py-3 text-neutral-600">{m.chapter.name}</td>
                <td className="px-4 py-3 text-neutral-600">{formatIstDateTime(m.startsAt)}</td>
                <td className="px-4 py-3 text-neutral-600">{m._count.visitors}</td>
                <td className="px-4 py-3">
                  <ReminderBadge
                    enabled={m.reminderEnabled}
                    status={m.reminderStatus}
                    scheduledFor={formatIstDateTime(reminderScheduledFor(m.startsAt))}
                    meetingStatus={m.status}
                    isPast={m.startsAt < now}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/meetings/${m.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No meetings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateMeetingForm
        chapters={chapters}
        chiefGuests={chiefGuests}
        canManageChiefGuests={canManageChiefGuests}
        defaultChapterId={preselectChapterId && chapters.some((c) => c.id === preselectChapterId) ? preselectChapterId : undefined}
      />
    </div>
  );
}
