import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

export default async function MemberDashboardPage() {
  const { member } = await requireMemberProfile();

  const [chapter, category, company, pendingRevision] = await Promise.all([
    db.chapter.findUniqueOrThrow({ where: { id: member.chapterId } }),
    db.category.findUniqueOrThrow({ where: { id: member.categoryId } }),
    db.company.findUniqueOrThrow({ where: { id: member.companyId } }),
    db.memberProfileRevision.findFirst({ where: { memberId: member.id, status: "PENDING" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Welcome, {member.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {category.name} · {chapter.name} · {company.name}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Your profile</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Your public profile is at{" "}
          <Link href={`/members/${member.slug}`} target="_blank" className="text-neutral-900 underline">
            /members/{member.slug}
          </Link>
          . Changes you request go to BWF admin for review before anything public changes (brief §20) — they&rsquo;re
          never published directly from here.
        </p>
        {pendingRevision ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You have an edit request awaiting review, submitted {pendingRevision.createdAt.toLocaleDateString()}.
          </p>
        ) : null}
        <Link
          href="/member/profile"
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          View / edit my profile
        </Link>
      </div>

      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6">
        <p className="text-sm text-neutral-500">
          Article submissions, profile view statistics, and lead visibility are planned member-portal features
          (brief §12) without an assigned phase yet — see docs/ARCHITECTURE.md. Not available here yet.
        </p>
      </div>
    </div>
  );
}
