import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ACTIVITY_LABELS, ACTIVITY_UNITS, describeRule } from "@/lib/points/score";
import type { ActivityType } from "@/generated/prisma/client";
import { updatePointsConfig } from "./actions";
import { AdminPageIcon } from "@/components/admin/page-icon";

const inputClass =
  "w-24 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15";

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
          How many points a member earns for each activity, in the form &ldquo;Every N &hellip; = P
          points&rdquo; — e.g. every ₹500 of Thank You Slip value = 1 point. Only whole multiples
          score (₹1,400 at ₹500 = 1 point earns 2 points). Set points to 0 to exclude an activity
          from scoring entirely.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Rule</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]).map(([type, label]) => {
              const row = byType.get(type);
              const rule = { points: row?.points ?? 0, perUnit: row?.perUnit ?? 1 };
              const isValue = type === "THANK_YOU_SLIP";
              return (
                <tr key={type}>
                  <td className="px-4 py-3 align-top text-neutral-900">
                    {label}
                    <span className="mt-0.5 block text-xs text-neutral-500">Now: {describeRule(type, rule)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={updatePointsConfig.bind(null, type)} className="flex flex-wrap items-center gap-2 text-neutral-700">
                      <span>Every {isValue ? "₹" : ""}</span>
                      <input
                        type="number"
                        name="perUnit"
                        min="1"
                        required
                        aria-label={`Every how many ${isValue ? "rupees" : ACTIVITY_UNITS[type].many}`}
                        defaultValue={rule.perUnit}
                        className={inputClass}
                      />
                      <span>{isValue ? "of business value" : ACTIVITY_UNITS[type].many} =</span>
                      <input
                        type="number"
                        name="points"
                        min="0"
                        required
                        aria-label="Points"
                        defaultValue={rule.points}
                        className={inputClass}
                      />
                      <span>points</span>
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
