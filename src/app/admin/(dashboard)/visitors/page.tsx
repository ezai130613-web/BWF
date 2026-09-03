import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

const STATUS_STYLES: Record<string, string> = {
  REGISTERED: "bg-blue-50 text-blue-700",
  ATTENDED: "bg-amber-50 text-amber-700",
  FOLLOW_UP_REQUIRED: "bg-amber-50 text-amber-700",
  INTERESTED_IN_MEMBERSHIP: "bg-emerald-50 text-emerald-700",
  APPLICATION_SUBMITTED: "bg-emerald-50 text-emerald-700",
  CONVERTED: "bg-emerald-50 text-emerald-700",
  NOT_INTERESTED: "bg-neutral-100 text-neutral-500",
};

export default async function VisitorsPage() {
  const scope = await getChapterScope("visitors:manage");
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  const visitors = await db.visitor.findMany({
    where: chapterFilter,
    include: { category: true, chapter: true, meeting: true, event: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Visitors</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Everyone who registered to visit a meeting or event online (brief §23-25) — track
          follow-up here, then send the strong ones to Apply for Membership.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Registered for</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visitors.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 text-neutral-900">{v.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{v.chapter.name}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {v.meeting?.title ?? v.event?.title ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status]}`}>
                    {v.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{v.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/visitors/${v.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {visitors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No visitor registrations yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
