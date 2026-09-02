import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

export default async function FeedbackPage() {
  await requirePermission("feedback:view");

  const feedback = await db.feedback.findMany({
    include: { chapter: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Feedback</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-600">
          Super Admin only (brief §34) — never published, and not shown to Central or Chapter
          Admins unless a Super Admin later grants that explicitly.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {feedback.map((f) => (
              <tr key={f.id}>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{f.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-600">{f.type}</td>
                <td className="px-4 py-3 text-neutral-600">{f.name ?? "Anonymous"}{f.email ? ` (${f.email})` : ""}</td>
                <td className="px-4 py-3 text-neutral-600">{f.chapter?.name ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-900">{f.message}</td>
              </tr>
            ))}
            {feedback.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No feedback yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
