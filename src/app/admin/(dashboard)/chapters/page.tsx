import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateChapterForm } from "@/components/admin/create-chapter-form";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-amber-50 text-amber-700",
  ARCHIVED: "bg-neutral-100 text-neutral-500",
};

export default async function ChaptersPage() {
  await requirePermission("chapters:manage");

  const chapters = await db.chapter.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Chapters</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          Draft chapters exist internally without appearing on the public site (brief §16) —
          publish by setting status to Active on the chapter&rsquo;s own page.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {chapters.map((chapter) => (
              <tr key={chapter.id}>
                <td className="px-4 py-3 text-neutral-900">{chapter.name}</td>
                <td className="px-4 py-3 text-neutral-500">{chapter.location ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{chapter._count.members}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[chapter.status]}`}>
                    {chapter.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/chapters/${chapter.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateChapterForm />
    </div>
  );
}
