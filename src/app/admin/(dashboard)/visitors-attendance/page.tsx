import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ExportButton } from "@/components/admin/export-button";

/**
 * Visitors Attendance — meeting-wise view, step 1/2 (Select Chapter, Select
 * Meeting). Same picker pattern as Visitors QR / the member-facing
 * Attendance Management page, kept as its own permission-gated nav entry
 * ("Visitors Attendance") so it's never confused with that member-only page.
 */
export default async function VisitorsAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string }>;
}) {
  const scope = await getChapterScope("attendance:manage");
  const { chapterId: requestedChapterId } = await searchParams;

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const chapterId = scope === "ALL" ? requestedChapterId : scope;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Visitors Attendance</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Meeting-wise visitor check-ins — total registered, checked in, member-invited, and
            other-source visitors.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ExportButton dataset="visitor-attendance" params={{ chapterId }} />
          <Link href="/admin/visitors-attendance/profiles" className="text-sm text-neutral-600 underline hover:text-emerald-800">
            Visitor-wise view →
          </Link>
        </div>
      </div>

      {scope === "ALL" && !chapterId ? (
        <form
          action="/admin/visitors-attendance"
          method="GET"
          className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:max-w-sm"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Chapter
            <select
              name="chapterId"
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            >
              <option value="">Select a chapter…</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            Continue
          </button>
        </form>
      ) : chapterId ? (
        <MeetingPicker chapterId={chapterId} showChapterPicker={scope === "ALL"} />
      ) : null}
    </div>
  );
}

async function MeetingPicker({ chapterId, showChapterPicker }: { chapterId: string; showChapterPicker: boolean }) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    return <p className="text-sm text-red-600">That chapter no longer exists.</p>;
  }

  const meetings = await db.meeting.findMany({
    where: { chapterId },
    include: { _count: { select: { visitorAttendances: true } } },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      {showChapterPicker ? (
        <Link href="/admin/visitors-attendance" className="text-sm text-neutral-500 hover:text-emerald-800">
          ← Choose a different chapter
        </Link>
      ) : null}

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <h2 className="text-sm font-semibold text-neutral-900">{chapter.name}</h2>

        {meetings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No meetings for this chapter yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{meeting.title}</p>
                  <p className="text-xs text-neutral-500">
                    {meeting.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
                    {meeting._count.visitorAttendances} recorded
                  </span>
                  <Link
                    href={`/admin/visitors-attendance/${meeting.id}`}
                    className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    View visitors
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
