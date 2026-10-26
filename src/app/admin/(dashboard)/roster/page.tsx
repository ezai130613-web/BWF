import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ExportButton } from "@/components/admin/export-button";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — steps 1–2
 * of the workflow (Select Chapter, Create/Select Meeting). Stay plain
 * GET-form/link driven, no client JS, same convention as before and as
 * /apply's own first step. Step 2 now lists every meeting for the chapter
 * (not just upcoming/scheduled ones) so a past meeting's already-saved
 * roster can be reopened and edited — requirement 2. Creating a new
 * meeting links out to the existing /admin/meetings page rather than
 * duplicating that form here (client's own call, 2026-09-16).
 */
export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string }>;
}) {
  const scope = await getChapterScope("roster:manage");
  const { chapterId: requestedChapterId } = await searchParams;

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const chapterId = scope === "ALL" ? requestedChapterId : scope;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Roster Sheets</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Manage a chapter meeting&rsquo;s full roster on this page — members, scores and
            automatic ranking, open categories, and the Notes column — then save and download the
            printable PDF. Coordinators are managed on each chapter&rsquo;s own page, at{" "}
            <Link href="/admin/chapters" className="text-neutral-900 underline">
              Chapters
            </Link>
            .
          </p>
        </div>
        <ExportButton dataset="roster" params={{ chapterId }} />
      </div>

      {scope === "ALL" && !chapterId ? (
        <form action="/admin/roster" method="GET" className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:max-w-sm">
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
          <button
            type="submit"
            className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
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
    include: { roster: { select: { savedAt: true } } },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      {showChapterPicker ? (
        <Link href="/admin/roster" className="text-sm text-neutral-500 hover:text-emerald-800">
          ← Choose a different chapter
        </Link>
      ) : null}

      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">{chapter.name}</h2>
          <Link
            href={`/admin/meetings?chapterId=${chapterId}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            + Create a new meeting
          </Link>
        </div>

        {meetings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No meetings for this chapter yet — create one, then come back here to manage its
            roster.
          </p>
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
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      meeting.roster?.savedAt ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {meeting.roster?.savedAt ? "Saved" : "Not started yet"}
                  </span>
                  <Link
                    href={`/admin/roster/${meeting.id}`}
                    className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    {meeting.roster?.savedAt ? "Edit roster" : "Manage roster"}
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
