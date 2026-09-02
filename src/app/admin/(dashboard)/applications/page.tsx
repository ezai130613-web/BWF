import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  UNDER_REVIEW: "bg-amber-50 text-amber-700",
  CONTACTED: "bg-amber-50 text-amber-700",
  MEETING_SCHEDULED: "bg-amber-50 text-amber-700",
  APPROVED_IN_PRINCIPLE: "bg-emerald-50 text-emerald-700",
  WAITING_FOR_PAYMENT: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  WAITLISTED: "bg-neutral-100 text-neutral-600",
};

export default async function ApplicationsPage() {
  await requirePermission("applications:manage");

  const applications = await db.membershipApplication.findMany({
    include: { category: true, chapter: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Membership Applications</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Approval alone never creates a public member (brief §17) — convert an application from
          its own page once payment is confirmed.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {applications.map((app) => (
              <tr key={app.id}>
                <td className="px-4 py-3 text-neutral-900">{app.name}</td>
                <td className="px-4 py-3 text-neutral-600">{app.category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{app.chapter?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status]}`}>
                    {app.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{app.createdAt.toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/applications/${app.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No applications yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
