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

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; categoryId?: string }>;
}) {
  const scope = await getChapterScope("members:manage");
  const { chapterId: requestedChapterId, categoryId } = await searchParams;

  // A Chapter Admin's scope always wins over the query param — a spoofed
  // ?chapterId= for another chapter must never widen what they see.
  const chapterId = scope === "ALL" ? requestedChapterId || undefined : scope;
  const where = {
    ...(chapterId ? { chapterId } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [members, referralCandidates, chapters, categories, companies] = await Promise.all([
    db.member.findMany({
      where,
      include: { company: true, chapter: true, category: true },
      orderBy: { createdAt: "desc" },
    }),
    // For the "referred by" picker below — scoped like the table (Chapter
    // Admin only sees their own chapter's members), but deliberately NOT
    // narrowed by the chapter/category filter above; that filter is for
    // browsing the table, not for who can be picked as a referrer.
    db.member.findMany({
      where: scope === "ALL" ? { status: "ACTIVE" } : { chapterId: scope, status: "ACTIVE" },
      select: { id: true, name: true, chapter: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.chapter.findMany({
      where: scope === "ALL" ? {} : { id: scope },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.company.findMany({ orderBy: { name: "asc" } }),
  ]);

  const pendingRevisions = await db.memberProfileRevision.findMany({
    where: { status: "PENDING", memberId: { in: members.map((m) => m.id) } },
    select: { memberId: true },
  });
  const pendingMemberIds = new Set(pendingRevisions.map((r) => r.memberId));

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

      <form className="flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-4" method="GET">
        {scope === "ALL" ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Chapter
            <select
              name="chapterId"
              defaultValue={chapterId ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Category
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Filter
        </button>
        {chapterId || categoryId ? (
          <Link href="/admin/members" className="text-sm text-neutral-500 hover:text-neutral-900">
            Clear filters
          </Link>
        ) : null}
      </form>

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
                <td className="px-4 py-3 text-neutral-900">
                  {member.name}
                  {pendingMemberIds.has(member.id) ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Edit pending
                    </span>
                  ) : null}
                </td>
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
                  {chapterId || categoryId ? "No members match these filters." : "No members yet."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-neutral-500">Add a company first (Companies page) before adding members.</p>
      ) : (
        <CreateMemberForm
          chapters={chapters}
          categories={categories}
          companies={companies}
          members={referralCandidates.map((m) => ({ id: m.id, name: m.name, chapterName: m.chapter.name }))}
        />
      )}
    </div>
  );
}
