import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { PLATFORM_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS, formatIst } from "@/lib/marketing/constants";

export default async function MarketingDashboardPage() {
  await requirePermission("marketing:manage");

  const [contentCount, statusCounts, upcoming, connections] = await Promise.all([
    db.marketingContent.count(),
    db.scheduledPost.groupBy({ by: ["status"], _count: { _all: true } }),
    db.scheduledPost.findMany({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
      take: 5,
      include: { content: { select: { title: true } } },
    }),
    db.platformConnection.findMany(),
  ]);

  const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;
  const connectedCount = connections.filter((c) => c.status === "CONNECTED").length;

  const tiles = [
    { label: "Content uploaded", value: contentCount },
    { label: "Scheduled", value: countFor("SCHEDULED") },
    { label: "Published", value: countFor("PUBLISHED") },
    { label: "Needs attention", value: countFor("FAILED") + countFor("ACTION_REQUIRED") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Marketing</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Upload a video once, schedule it across Instagram, Facebook, YouTube, and Pinterest, and track what&rsquo;s published.
        </p>
      </div>

      {connectedCount === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No social accounts are connected yet — schedules you create here will be saved, but nothing publishes automatically until
          accounts are connected. See{" "}
          <Link href="/admin/marketing/connected-accounts" className="underline">
            Connected Accounts
          </Link>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-2xl font-semibold text-neutral-900">{tile.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Upcoming scheduled posts</h2>
        <div className="mt-4 flex flex-col divide-y divide-neutral-100">
          {upcoming.map((post) => (
            <div key={post.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-neutral-900">{post.content.title}</p>
                <p className="text-neutral-500">
                  {PLATFORM_LABELS[post.platform]} · {formatIst(post.scheduledFor)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[post.status]}`}>
                {STATUS_LABELS[post.status]}
              </span>
            </div>
          ))}
          {upcoming.length === 0 ? <p className="py-3 text-sm text-neutral-400">Nothing scheduled yet.</p> : null}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/marketing/create" className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          Write &amp; create content
        </Link>
        <Link
          href="/admin/marketing/calendar"
          className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          View calendar
        </Link>
      </div>
    </div>
  );
}
