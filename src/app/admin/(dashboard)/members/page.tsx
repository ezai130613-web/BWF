import Link from "next/link";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateMemberForm } from "@/components/admin/create-member-form";
import { updateMemberStatus } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-neutral-100 text-neutral-500",
  SUSPENDED: "bg-red-50 text-red-700",
};

export default async function MembersPage() {
  const scope = await getChapterScope("members:manage");
  const chapterFilter = scope === "ALL" ? {} : { chapterId: scope };

  const [members, chapters, categories, companies] = await Promise.all([
    db.member.findMany({
      where: chapterFilter,
      include: { company: true, chapter: true, category: true },
      orderBy: { createdAt: "desc" },
    }),
    db.chapter.findMany({
      where: scope === "ALL" ? {} : { id: scope },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Members</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Only one ACTIVE member may hold a given category within a chapter (brief §15) — this
          is enforced by a database constraint, not just this form, so it can&rsquo;t be
          bypassed even by a direct API call.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-4 py-3 text-neutral-900">{member.name}</td>
                <td className="px-4 py-3 text-neutral-600">{member.company.name}</td>
                <td className="px-4 py-3 text-neutral-600">{member.chapter.name}</td>
                <td className="px-4 py-3 text-neutral-600">{member.category.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[member.status]}`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/admin/members/${member.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await updateMemberStatus(member.id, member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
                      }}
                    >
                      <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                        {member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No members yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-neutral-500">Add a company first (Companies page) before adding members.</p>
      ) : (
        <CreateMemberForm chapters={chapters} categories={categories} companies={companies} />
      )}
    </div>
  );
}
