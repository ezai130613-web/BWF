import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Attendance Management — member-wise view (spec: "Search member and show
 * every meeting they were expected to attend... Filter by chapter, meeting,
 * member, date range and status. Exclude meetings before joining or after
 * leaving the chapter."). This schema has no "left the chapter on" date, so
 * "after leaving" narrows to "meetings on/after Member.joinedAt within
 * their current chapter" — the closest honest reading available today.
 */
export default async function AttendanceMembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    chapterId?: string;
    categoryId?: string;
    memberId?: string;
    meetingId?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
}) {
  const scope = await getChapterScope("attendance:manage");
  const params = await searchParams;

  // Chapter filter only makes sense for Super/Central Admin — a Chapter
  // Admin is already fixed to their own chapter via scope.
  const requestedChapterId = scope === "ALL" ? params.chapterId : scope;

  const memberWhere: Prisma.MemberWhereInput = {
    status: "ACTIVE",
    ...(requestedChapterId ? { chapterId: requestedChapterId } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
  };

  const [matches, selectedMember, chapters, categories] = await Promise.all([
    params.memberId
      ? []
      : db.member.findMany({ where: memberWhere, include: { chapter: true, category: true }, orderBy: { name: "asc" }, take: 25 }),
    params.memberId ? db.member.findUnique({ where: { id: params.memberId }, include: { chapter: true, category: true } }) : null,
    scope === "ALL" ? db.chapter.findMany({ orderBy: { name: "asc" } }) : [],
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (selectedMember && scope !== "ALL" && selectedMember.chapterId !== scope) {
    return <p className="text-sm text-red-600">You don&rsquo;t have access to this member.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Attendance — Member-wise View</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Search a member to see their full attendance history and percentage.
          </p>
        </div>
        <Link href="/admin/attendance" className="text-sm text-neutral-600 underline hover:text-neutral-900">
          ← Meeting-wise view
        </Link>
      </div>

      {!selectedMember ? (
        <>
          <form action="/admin/attendance/members" method="GET" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Name
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search member by name…"
                className="w-full min-w-[16rem] rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
              />
            </label>
            {scope === "ALL" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                Chapter
                <select name="chapterId" defaultValue={params.chapterId ?? ""} className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
                  <option value="">All chapters</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Category
              <select name="categoryId" defaultValue={params.categoryId ?? ""} className="rounded-md border border-neutral-300 px-2 py-2 text-sm">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Search
            </button>
          </form>

          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {matches.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                  <p className="text-xs text-neutral-500">
                    {member.chapter.name} · {member.category.name}
                  </p>
                </div>
                <Link
                  href={`/admin/attendance/members?memberId=${member.id}`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400"
                >
                  View history
                </Link>
              </li>
            ))}
            {matches.length === 0 && (params.q || params.chapterId || params.categoryId) ? (
              <li className="px-4 py-8 text-center text-sm text-neutral-400">No members matched.</li>
            ) : null}
          </ul>
        </>
      ) : (
        <MemberHistory member={selectedMember} filters={params} />
      )}
    </div>
  );
}

async function MemberHistory({
  member,
  filters,
}: {
  member: NonNullable<Awaited<ReturnType<typeof db.member.findUnique>>> & { chapter: { name: string }; category: { name: string } };
  filters: { meetingId?: string; from?: string; to?: string; status?: string };
}) {
  // Never show a meeting before the member joined this chapter, even if a
  // narrower "from" filter is requested (spec: "Exclude meetings before
  // joining... the chapter").
  const effectiveFrom = filters.from && new Date(filters.from) > member.joinedAt ? new Date(filters.from) : member.joinedAt;

  const meetingWhere: Prisma.MeetingWhereInput = {
    chapterId: member.chapterId,
    startsAt: {
      gte: effectiveFrom,
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    },
    ...(filters.meetingId ? { id: filters.meetingId } : {}),
  };

  const meetings = await db.meeting.findMany({
    where: meetingWhere,
    include: { attendances: { where: { memberId: member.id } } },
    orderBy: { startsAt: "desc" },
  });

  const rows = meetings
    .map((meeting) => ({ meeting, attendance: meeting.attendances[0] ?? null }))
    .filter((row) => !filters.status || filters.status === "NOT_CHECKED_IN" ? !row.attendance : row.attendance?.status === filters.status);

  const totalExpected = meetings.length;
  const attended = meetings.filter((m) => m.attendances[0]?.status === "PRESENT").length;
  const missed = totalExpected - attended;
  const percentage = totalExpected > 0 ? Math.round((attended / totalExpected) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/attendance/members" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Search a different member
      </Link>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">{member.name}</h2>
        <p className="text-sm text-neutral-600">
          {member.chapter.name} · {member.category.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Expected" value={totalExpected} />
        <StatCard label="Attended" value={attended} />
        <StatCard label="Missed" value={missed} />
        <StatCard label="Attendance %" value={`${percentage}%`} />
      </div>

      <form action="/admin/attendance/members" method="GET" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="memberId" value={member.id} />
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          From
          <input type="date" name="from" defaultValue={filters.from} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          To
          <input type="date" name="to" defaultValue={filters.to} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="NOT_CHECKED_IN">Not Checked In</option>
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
              <th className="px-4 py-3 font-medium">Meeting</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Check-in time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map(({ meeting, attendance }) => (
              <tr key={meeting.id}>
                <td className="px-4 py-3 font-medium text-neutral-900">{meeting.title}</td>
                <td className="px-4 py-3 text-neutral-600">{meeting.startsAt.toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      attendance?.status === "PRESENT"
                        ? "bg-emerald-50 text-emerald-700"
                        : attendance?.status === "ABSENT"
                          ? "bg-red-50 text-red-700"
                          : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {attendance?.status === "PRESENT" ? "Present" : attendance?.status === "ABSENT" ? "Absent" : "Not Checked In"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {attendance?.checkedInAt ? attendance.checkedInAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No meetings match these filters.
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
