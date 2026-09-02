import { requireAdminSession } from "@/lib/auth/rbac";

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">
        Welcome, {session.user.name ?? session.user.email}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-600">
        Operational metrics (active members, pending applications, upcoming meetings, and so
        on — brief §39) populate here progressively as each data source ships, starting with
        Phase 3. For now, use the sidebar to manage admin users and review the activity log.
      </p>
    </div>
  );
}
