import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { toggleUserStatus } from "./actions";

export default async function UsersPage() {
  await requirePermission("users:manage");

  const [users, chapters] = await Promise.all([
    db.user.findMany({
      include: { roles: { include: { role: true, chapter: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Users</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Admin accounts only — the member self-service portal (brief §12) ships in Phase 11.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-neutral-900">{user.name}</td>
                <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {user.roles
                    .map((r) => (r.chapter ? `${r.role.label} — ${r.chapter.name}` : r.role.label))
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.status === "ACTIVE"
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                    }
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={toggleUserStatus.bind(null, user.id)}>
                    <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                      {user.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Create admin user</h2>
        <div className="mt-3">
          <CreateUserForm chapters={chapters} />
        </div>
      </div>
    </div>
  );
}
