import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole, getUserPermissionKeys } from "@/lib/auth/rbac";
import { ADMIN_ROLE_KEYS, fixedWorkspaceFor } from "@/lib/auth/constants";
import { db } from "@/lib/db";
import { ReauthGuard } from "@/components/admin/reauth-guard";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { WORKSPACE_LABELS, permissionPanels } from "@/components/admin/nav-config";
import { resetUserAccess, setUserAccess } from "../../actions";

/**
 * Per-person access editor (2026-11-03). Super Admin ticks exactly what this
 * admin can do; "Use role defaults" goes back to the role's set from Roles &
 * Permissions. Opens pre-ticked with what the person holds right now.
 */
export default async function UserAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;
  const { saved } = await searchParams;

  const [user, permissions] = await Promise.all([
    db.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } }),
    db.permission.findMany({ orderBy: { key: "asc" } }),
  ]);
  const adminRole = user?.roles.find((r) => ADMIN_ROLE_KEYS.includes(r.role.key));
  if (!user || !adminRole) notFound();

  const isSuperAdmin = adminRole.role.key === "SUPER_ADMIN";
  const isSelf = user.id === session.user.id;
  const current = await getUserPermissionKeys(user.id);
  const labels = new Map(permissions.map((p) => [p.key, p.label]));
  const panels = permissionPanels(permissions.map((p) => p.key));
  const fixed = fixedWorkspaceFor(user.roles.map((r) => r.role.key));
  const editable = !isSuperAdmin && !isSelf;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-800">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />Access — {user.name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {user.email ?? user.username?.toLowerCase()} · {adminRole.role.label} ·{" "}
          {isSuperAdmin ? "full access" : user.customAccess ? "custom access for this person" : "using the role's default access"}
        </p>
      </div>

      {saved ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Saved. Takes effect on their next page load.
        </p>
      ) : null}

      {isSuperAdmin ? (
        <p className="text-sm text-neutral-600">Super Admins always have full access. Change their role first to limit it.</p>
      ) : isSelf ? (
        <p className="text-sm text-neutral-600">You can&apos;t change your own access.</p>
      ) : null}

      {fixed && editable ? (
        <p className="max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          The {adminRole.role.label} role always works inside one panel ({WORKSPACE_LABELS[fixed]}), so only
          ticks in that panel show up for them. To give access to several panels, change their role to
          Central Admin on the Users page.
        </p>
      ) : null}

      <ReauthGuard>
        <form action={setUserAccess.bind(null, user.id)} className="flex flex-col gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {panels.map((panel) => (
              <fieldset key={panel.title} disabled={!editable} className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
                <legend className="px-1 text-sm font-semibold text-neutral-900">{panel.title}</legend>
                <div className="mt-1 flex flex-col gap-2">
                  {panel.keys.map((key) => (
                    <label key={key} className="flex items-start gap-2.5 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        name="permission"
                        value={key}
                        defaultChecked={current.has(key)}
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-emerald-800"
                      />
                      <span>{labels.get(key) ?? key}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          {editable ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Save access for this person
              </button>
              {user.customAccess ? (
                <button
                  type="submit"
                  formAction={resetUserAccess.bind(null, user.id)}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-emerald-800 hover:text-emerald-800"
                >
                  Use role defaults instead
                </button>
              ) : null}
              {!fixed ? (
                <span className="text-xs text-neutral-500">Panels with nothing ticked are hidden from their workspace picker.</span>
              ) : null}
            </div>
          ) : null}
        </form>
      </ReauthGuard>
    </div>
  );
}
