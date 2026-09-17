import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { MarketingNav } from "@/components/admin/marketing-nav";
import { ScheduledPostCard } from "@/components/admin/scheduled-post-card";

/** Brief §10 — publishing history: platforms published to, date/time, status, and published URL where available. */
export default async function MarketingHistoryPage() {
  await requirePermission("marketing:manage");

  const posts = await db.scheduledPost.findMany({
    where: { status: { in: ["PUBLISHED", "FAILED", "ACTION_REQUIRED"] } },
    include: { content: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Publishing History</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">Published and failed posts across every platform.</p>
      </div>

      <MarketingNav active="/admin/marketing/history" />

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <div key={post.id} className="flex flex-col gap-2">
            <Link href={`/admin/marketing/library/${post.content.id}`} className="text-sm font-medium text-neutral-900 hover:underline">
              {post.content.title}
            </Link>
            <ScheduledPostCard post={post} />
          </div>
        ))}
        {posts.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-400">
            Nothing published or failed yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
