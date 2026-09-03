import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateMeetingForm } from "@/components/admin/create-meeting-form";

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-neutral-100 text-neutral-500",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function MeetingsPage() {
  const scope = await getChapterScope("meetings:manage");
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  const [meetings, chapters] = await Promise.all([
    db.meeting.findMany({
      where: chapterFilter,
      include: { chapter: true, _count: { select: { visitors: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.chapter.findMany({ where: scope === "ALL" ? {} : { id: scope }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Meetings</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Chapter meetings that visitors can register to attend online (brief §21/§23).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Visitors</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {meetings.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-neutral-900">{m.title}</td>
                <td className="px-4 py-3 text-neutral-600">{m.chapter.name}</td>
                <td className="px-4 py-3 text-neutral-600">{m.startsAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-600">{m._count.visitors}</td>
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
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No meetings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateMeetingForm chapters={chapters} />
    </div>
  );
}
