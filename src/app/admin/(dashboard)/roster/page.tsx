import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

/**
 * Phase 20 Batch 3 — Roster Sheet generation. Plain GET forms / query
 * params, no client JS, same convention as the old Exports page and every
 * other multi-step public wizard in this app (/apply, /visit). Picking a
 * chapter is its own step (?chapterId=) since the meeting/chief-guest
 * choices that follow depend on it — a Chapter Admin skips straight to
 * step 2, already locked to their own chapter.
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
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Roster Sheets</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Generate a chapter&rsquo;s printable meeting Roster Sheet PDF — cover, meeting roles,
          full member table, and an invitation flyer for an upcoming meeting. Meeting Roles are
          managed on each chapter&rsquo;s own page; the role catalog itself lives at{" "}
          <Link href="/admin/roster-roles" className="text-neutral-900 underline">
            Roster Roles
          </Link>
          .
        </p>
      </div>

      {scope === "ALL" && !chapterId ? (
        <form action="/admin/roster" method="GET" className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:max-w-sm">
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
          <button
            type="submit"
            className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Continue
          </button>
        </form>
      ) : chapterId ? (
        <GenerateRosterForm chapterId={chapterId} showChapterPicker={scope === "ALL"} />
      ) : null}
    </div>
  );
}

async function GenerateRosterForm({ chapterId, showChapterPicker }: { chapterId: string; showChapterPicker: boolean }) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter) {
    return <p className="text-sm text-red-600">That chapter no longer exists.</p>;
  }

  const [meetings, chiefGuests] = await Promise.all([
    db.meeting.findMany({
      where: { chapterId, status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    db.chiefGuest.findMany({ where: { chapterId }, orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {showChapterPicker ? (
        <Link href="/admin/roster" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Choose a different chapter
        </Link>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">{chapter.name}</h2>

        {meetings.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No upcoming scheduled meetings for this chapter yet — add one at{" "}
            <Link href="/admin/meetings" className="text-neutral-900 underline">
              Meetings
            </Link>{" "}
            before generating a roster (the invitation flyer needs a real date, time, and venue).
          </p>
        ) : (
          <form action="/api/admin/roster" method="GET" className="mt-4 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Meeting
              <select
                name="meetingId"
                required
                className="w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              >
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title} — {meeting.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </option>
                ))}
              </select>
            </label>

            {chiefGuests.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-neutral-700">
                  Feature on this roster (cover + invitation flyer) — optional
                </legend>
                {chiefGuests.map((guest) => (
                  <label key={guest.id} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input type="checkbox" name="chiefGuestIds" value={guest.id} className="h-4 w-4 rounded border-neutral-300" />
                    {guest.name}
                    {guest.company ? ` — ${guest.company}` : ""}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="text-sm text-neutral-500">
                No Chief Guests recorded for this chapter yet — the roster&rsquo;s cover and flyer
                will render without one. Add some at{" "}
                <Link href="/admin/chief-guests" className="text-neutral-900 underline">
                  Chief Guests
                </Link>
                .
              </p>
            )}

            <button
              type="submit"
              className="self-start rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Download Roster PDF
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
