import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatIst, formatIstDateTime } from "@/lib/ist";

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requirePermission("feedback:view");
  const { id: highlightId } = await searchParams;

  const feedback = await db.feedback.findMany({
    include: { chapter: true, meeting: true, invitedByMember: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Feedback</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            Super Admin only (brief §34) — never published, and not shown to Central or Chapter
            Admins unless a Super Admin later grants that explicitly. Every submission is also emailed to the
            recipients configured in Settings.
          </p>
        </div>
        <Link href="/admin/settings" className="text-sm text-neutral-500 underline hover:text-neutral-900">
          Email recipients →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">When (IST)</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">From</th>
              <th className="px-4 py-3 font-medium">Chapter / Meeting</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {feedback.map((f) => (
              <tr
                key={f.id}
                id={`feedback-${f.id}`}
                className={f.id === highlightId ? "bg-amber-50 outline outline-2 outline-amber-400" : undefined}
              >
                <td className="whitespace-nowrap px-4 py-3 align-top text-neutral-500">{formatIstDateTime(f.createdAt)}</td>
                <td className="px-4 py-3 align-top text-neutral-600">{f.type}</td>
                <td className="px-4 py-3 align-top text-neutral-600">
                  <p className="text-neutral-900">{f.name ?? "Anonymous"}</p>
                  {f.company ? <p className="text-xs">{f.company}</p> : null}
                  {f.phone ? <p className="text-xs">{f.phone}</p> : null}
                  {f.email ? <p className="text-xs">{f.email}</p> : null}
                  {f.invitedByMember ? <p className="text-xs text-neutral-500">Invited by {f.invitedByMember.name}</p> : null}
                </td>
                <td className="px-4 py-3 align-top text-neutral-600">
                  <p>{f.chapter?.name ?? "—"}</p>
                  {f.meeting ? (
                    <p className="text-xs text-neutral-500">
                      {f.meeting.title} · {formatIst(f.meeting.startsAt, { day: "numeric", month: "short" })}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-amber-600">
                  {f.rating ? `${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}` : <span className="text-neutral-400">—</span>}
                </td>
                <td className="whitespace-pre-line px-4 py-3 align-top text-neutral-900">{f.message}</td>
              </tr>
            ))}
            {feedback.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
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
