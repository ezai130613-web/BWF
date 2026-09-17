import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

/**
 * QR Code Generation — step 1/2 (Select Chapter, Select Meeting). Same
 * plain GET-form/link pattern as /admin/roster's own chapter+meeting picker
 * — reuses the same Meeting records created for the Roster Sheet module,
 * per the spec.
 */
export default async function QrCodesPage({
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
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">QR Code Generation</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Generate a secure, meeting-specific registration QR — members scan it, sign in, and
          check themselves in. Reopening a meeting here shows its existing QR rather than making a
          new one.
        </p>
      </div>

      {scope === "ALL" && !chapterId ? (
        <form action="/admin/qr-codes" method="GET" className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:max-w-sm">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Chapter
            <select
              name="chapterId"
              required
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Select a chapter…</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
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

  const meetings = await db.meeting.findMany({ where: { chapterId }, orderBy: { startsAt: "desc" } });

  return (
    <div className="flex flex-col gap-4">
      {showChapterPicker ? (
        <Link href="/admin/qr-codes" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Choose a different chapter
        </Link>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">{chapter.name}</h2>
          <Link
            href={`/admin/meetings?chapterId=${chapterId}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
          >
            + Create a new meeting
          </Link>
        </div>

        {meetings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No meetings for this chapter yet — create one, then come back here to generate its QR.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {meetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{meeting.title}</p>
                  <p className="text-xs text-neutral-500">
                    {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      meeting.attendanceQrToken ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {meeting.attendanceQrToken ? "QR generated" : "Not generated"}
                  </span>
                  <Link
                    href={`/admin/qr-codes/${meeting.id}`}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                  >
                    {meeting.attendanceQrToken ? "View QR" : "Generate QR"}
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
