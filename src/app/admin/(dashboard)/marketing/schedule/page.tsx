import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { PLATFORMS } from "@/lib/marketing/constants";

/**
 * Scheduling & Posting (2026-09-18) — the promoted, top-level entry point
 * for the same composer that's always lived on a content's own detail page
 * (`/admin/marketing/library/[id]`). This page itself is just the "which
 * content am I scheduling?" picker — the actual platform-selection/caption/
 * time form is the existing `ScheduleComposer`, reached by opening a row
 * below, so there's one real implementation of the composer, not two.
 */
export default async function MarketingSchedulePage() {
  await requirePermission("marketing:manage");

  const content = await db.marketingContent.findMany({
    include: { scheduledPosts: { select: { platform: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const needsScheduling = content.filter((c) => c.scheduledPosts.length < PLATFORMS.length);
  const fullyScheduled = content.filter((c) => c.scheduledPosts.length >= PLATFORMS.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Scheduling & Posting</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Pick a piece of content to select platforms, write per-platform captions, and choose publishing times.
          </p>
        </div>
        <Link
          href="/admin/marketing/create"
          className="flex-shrink-0 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + New content
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">Needs scheduling</h2>
        <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {needsScheduling.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2 URL, not a next/image-managed asset
                  <img src={item.thumbnailUrl} alt="" className="h-12 w-12 rounded-md border border-neutral-200 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-400">
                    Video
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                  <p className="text-xs text-neutral-500">
                    {item.scheduledPosts.length === 0
                      ? "Not scheduled to any platform yet"
                      : `Scheduled to ${item.scheduledPosts.length} of ${PLATFORMS.length} platforms`}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/marketing/library/${item.id}`}
                className="flex-shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Schedule →
              </Link>
            </div>
          ))}
          {needsScheduling.length === 0 ? (
            <p className="p-6 text-center text-sm text-neutral-400">
              Nothing waiting to be scheduled.{" "}
              <Link href="/admin/marketing/create" className="underline">
                Create something new
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>

      {fullyScheduled.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-900">Fully scheduled</h2>
          <div className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
            {fullyScheduled.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                <Link href={`/admin/marketing/library/${item.id}`} className="text-sm text-neutral-500 hover:text-neutral-900">
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
