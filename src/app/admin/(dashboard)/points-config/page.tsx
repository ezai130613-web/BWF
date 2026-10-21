import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ACTIVITY_LABELS } from "@/lib/points/score";
import type { ActivityType } from "@/generated/prisma/client";
import { updatePointsConfig } from "./actions";
import { AdminPageIcon } from "@/components/admin/page-icon";

export default async function PointsConfigPage() {
  await requirePermission("points_config:manage");

  const rows = await db.pointsConfig.findMany();
  const byType = new Map(rows.map((r) => [r.activityType, r]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />BWF App — Points & Scoring</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          How many points a member earns per activity, recorded through the BWF App. Set to 0 to
          exclude an activity from scoring entirely.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Points per occurrence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([type, label]) => {
              const row = byType.get(type);
              return (
                <tr key={type}>
                  <td className="px-4 py-3 text-neutral-900">{label}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    <form action={updatePointsConfig.bind(null, type)} className="flex items-center gap-3">
                      <input
                        type="number"
                        name="points"
                        min="0"
                        defaultValue={row?.points ?? 0}
                        className="w-24 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                      />
                      <button type="submit" className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
