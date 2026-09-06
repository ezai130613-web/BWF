import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { SubmitArticleForm } from "@/components/member/submit-article-form";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default async function MemberArticlesPage() {
  const { member } = await requireMemberProfile();

  const [categories, submissions] = await Promise.all([
    db.blogCategory.findMany({ orderBy: { name: "asc" } }),
    db.blog.findMany({
      where: { submittedByMemberId: member.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasPending = submissions.some((s) => s.submissionStatus === "PENDING");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Article Submissions</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Submit an article for BWF to review (brief §31). Nothing you write goes public until an
          admin approves it — same review-before-publish rule as your profile edits.
        </p>
      </div>

      {submissions.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Your submissions</h2>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-neutral-900">
                      {s.title}
                      {s.status === "PUBLISHED" ? (
                        <span className="ml-2 text-xs text-neutral-400">— live</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.submissionStatus ?? "PENDING"]}`}>
                        {s.submissionStatus}
                      </span>
                      {s.submissionStatus === "REJECTED" && s.reviewNotes ? (
                        <span className="ml-2 text-xs text-neutral-500">{s.reviewNotes}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{s.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {hasPending ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You have an article awaiting review. Wait for a decision before submitting another.
        </div>
      ) : (
        <SubmitArticleForm categories={categories} />
      )}
    </div>
  );
}
