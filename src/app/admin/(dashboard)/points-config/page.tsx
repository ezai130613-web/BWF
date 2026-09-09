import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ACTIVITY_LABELS } from "@/lib/points/score";
import type { ActivityType } from "@/generated/prisma/client";
import { updatePointsConfig } from "./actions";

export default async function PointsConfigPage() {
  await requirePermission("points_config:manage");

  const rows = await db.pointsConfig.findMany();
  const byType = new Map(rows.map((r) => [r.activityType, r]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">BWF App — Points & Scoring</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          How many points a member earns per activity, recorded through the BWF App. Set to 0 to
          exclude an activity from scoring entirely.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
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
                        className="w-24 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                      />
                      <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
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
