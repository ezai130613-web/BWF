import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateEventForm } from "@/components/admin/create-event-form";

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-neutral-100 text-neutral-500",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function EventsPage() {
  const scope = await getChapterScope("events:manage");
  // A Chapter Admin (scope = their chapterId) manages only their own
  // chapter's events, never global ones — see requireEventAccess in
  // src/app/admin/(dashboard)/events/actions.ts for why.
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  const [events, chapters] = await Promise.all([
    db.event.findMany({
      where: chapterFilter,
      include: { chapter: true, _count: { select: { visitors: true } } },
      orderBy: { startsAt: "desc" },
    }),
    db.chapter.findMany({ where: scope === "ALL" ? {} : { id: scope }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Events</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Chapter or global events with online registration (brief §26).
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Registrations</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-neutral-900">{e.title}</td>
                <td className="px-4 py-3 text-neutral-600">{e.chapter?.name ?? "Global"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.startsAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {e._count.visitors}
                  {e.capacity ? ` / ${e.capacity}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/events/${e.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateEventForm chapters={chapters} />
    </div>
  );
}
