import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditChapterForm } from "@/components/admin/edit-chapter-form";
import { AssignLeadershipForm } from "@/components/admin/assign-leadership-form";
import { removeChapterLeadership } from "../actions";

export default async function ChapterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chapters:manage");
  const { id } = await params;

  const chapter = await db.chapter.findUnique({
    where: { id },
    include: {
      members: { orderBy: { name: "asc" } },
      leadership: { include: { member: true, role: true }, orderBy: { startedAt: "asc" } },
    },
  });
  if (!chapter) notFound();

  const leadershipRoles = await db.chapterLeadershipRole.findMany({ orderBy: { label: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{chapter.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">/chapters/{chapter.slug}</p>
      </div>

      <EditChapterForm chapter={chapter} />

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Leadership</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Configurable role types (brief §22) — manage the role list itself via the database
          seed for now; assigning members to existing roles is fully self-service here.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {chapter.leadership.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-neutral-900">{entry.role.label}</td>
                  <td className="px-4 py-3 text-neutral-600">{entry.member.name}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={removeChapterLeadership.bind(null, chapter.id, entry.id)}>
                      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {chapter.leadership.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-400">
                    No leadership assigned yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          {chapter.members.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Add members to this chapter first before assigning leadership.
            </p>
          ) : (
            <AssignLeadershipForm chapterId={chapter.id} members={chapter.members} roles={leadershipRoles} />
          )}
        </div>
      </div>
    </div>
  );
}
