import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

export default async function ActivityLogPage() {
  await requirePermission("audit_log:view");

  const logs = await db.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Activity Log</h1>
        <p className="mt-1 text-sm text-neutral-600">Most recent 100 entries.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-neutral-600">{log.user?.name ?? "System"}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-900">{log.action}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {log.entity ? `${log.entity}${log.entityId ? ` (${log.entityId})` : ""}` : "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No activity yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
