import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { AddReportRecipientForm } from "@/components/admin/add-report-recipient-form";
import { ReportScheduleForm } from "@/components/admin/report-schedule-form";
import { removeReportRecipient, toggleReportRecipientActive } from "./actions";

export default async function ReportsPage() {
  await requirePermission("reports:manage");

  // The settings row always exists (seeded), but upsert defensively rather
  // than findUniqueOrThrow — and kept out of the Promise.all below since
  // mixing a write with unrelated reads in one batch is worth avoiding on
  // principle, not just for this page.
  const settings = await db.weeklyReportSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const [recipients, chapters] = await Promise.all([
    db.weeklyReportRecipient.findMany({ include: { chapter: true }, orderBy: { createdAt: "asc" } }),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Weekly Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Configure who receives the Weekly Member Export (brief §46) and on which day. Recipients
          and schedule are stored here and ready to use — actually sending it out automatically is
          Phase 13&rsquo;s job (Email/Notification Automation), the same phase every other
          automated email in this project lands in. Until then, generate the same report on demand
          from the <a href="/admin/exports" className="underline hover:text-neutral-900">Exports</a> page.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Schedule</h2>
        <div className="mt-4">
          <ReportScheduleForm dayOfWeek={settings.dayOfWeek} isEnabled={settings.isEnabled} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Recipients</h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Report</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recipients.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-neutral-900">{r.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.scope === "MASTER" ? "Master (all chapters)" : r.chapter?.name}</td>
                  <td className="px-4 py-3 text-neutral-600">{r.isActive ? "Active" : "Paused"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <form action={toggleReportRecipientActive.bind(null, r.id)}>
                        <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                          {r.isActive ? "Pause" : "Resume"}
                        </button>
                      </form>
                      <form action={removeReportRecipient.bind(null, r.id)}>
                        <button type="submit" className="text-sm text-neutral-500 hover:text-red-600">
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                    No recipients configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <AddReportRecipientForm chapters={chapters} />
      </div>
    </div>
  );
}
