import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateRosterRoleForm } from "@/components/admin/create-roster-role-form";

export default async function RosterRolesPage() {
  await requirePermission("chapters:manage");

  const roles = await db.rosterRole.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Roster Roles</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          The Meeting Role types (Power Date Host, Visitor Host, etc.) available when assigning a
          chapter&rsquo;s meeting duties, shown on its generated Roster Sheet — separate from
          Leadership. Add a new one here — it becomes available on every chapter&rsquo;s Meeting
          Roles form immediately, no code change needed.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Assignments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-4 py-3 text-neutral-900">{role.label}</td>
                <td className="px-4 py-3 text-neutral-600">{role._count.assignments}</td>
              </tr>
            ))}
            {roles.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-neutral-400">
                  No roster roles yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateRosterRoleForm />
    </div>
  );
}
