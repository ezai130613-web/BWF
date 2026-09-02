import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateAuthorForm } from "@/components/admin/create-author-form";

export default async function AuthorsPage() {
  await requirePermission("blogs:manage");

  const [authors, members] = await Promise.all([
    db.author.findMany({
      orderBy: { name: "asc" },
      include: { member: true, _count: { select: { posts: true } } },
    }),
    db.member.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Authors</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          BWF Team, guest contributors, or members writing under their own name (brief §32).
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Linked member</th>
              <th className="px-4 py-3 font-medium">Posts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {authors.map((author) => (
              <tr key={author.id}>
                <td className="px-4 py-3 text-neutral-900">{author.name}</td>
                <td className="px-4 py-3 text-neutral-600">{author.member?.name ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{author._count.posts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateAuthorForm members={members} />
    </div>
  );
}
