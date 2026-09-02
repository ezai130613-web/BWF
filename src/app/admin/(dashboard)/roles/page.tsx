import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { toggleRolePermission } from "./actions";

export default async function RolesPage() {
  await requirePermission("roles:manage");

  const [roles, permissions, rolePermissions] = await Promise.all([
    db.role.findMany({ orderBy: { key: "asc" } }),
    db.permission.findMany({ orderBy: { key: "asc" } }),
    db.rolePermission.findMany(),
  ]);

  const granted = new Set(rolePermissions.map((rp) => `${rp.roleId}:${rp.permissionId}`));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Roles & Permissions</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Only Super Admin and Central Admin are functional roles today — Chapter Admin and
          Member exist as reference data but have no scoped enforcement yet (that lands with
          the Chapter model in Phase 3, and the member portal in Phase 11). Super Admin&rsquo;s
          permissions are fixed and can&rsquo;t be edited here, to avoid an accidental lockout.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Permission</th>
              {roles.map((role) => (
                <th key={role.id} className="px-4 py-3 font-medium">
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {permissions.map((permission) => (
              <tr key={permission.id}>
                <td className="px-4 py-3 text-neutral-900">{permission.label}</td>
                {roles.map((role) => {
                  const isGranted = granted.has(`${role.id}:${permission.id}`);
                  const locked = role.key === "SUPER_ADMIN";
                  return (
                    <td key={role.id} className="px-4 py-3">
                      <form action={toggleRolePermission.bind(null, role.id, permission.id)}>
                        <button
                          type="submit"
                          disabled={locked}
                          aria-label={`${isGranted ? "Revoke" : "Grant"} ${permission.label} for ${role.label}`}
                          className={
                            isGranted
                              ? "h-5 w-5 rounded border border-neutral-900 bg-neutral-900 disabled:opacity-60"
                              : "h-5 w-5 rounded border border-neutral-300 disabled:opacity-40"
                          }
                        />
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
