import Link from "next/link";
import { getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { DATE_RANGE_PRESETS, resolveDateRange } from "@/lib/dashboard/date-range";

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{children}</h2>;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await requireAdminSession();
  const isChapterAdmin = session.user.roles.includes("CHAPTER_ADMIN");
  const chapterId = session.user.chapterId ?? null;

  const params = await searchParams;
  const range = resolveDateRange(params);

  const metrics = await getDashboardMetrics(isChapterAdmin && chapterId ? chapterId : "ALL", range);
  const permissions = await getUserPermissionKeys(session.user.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            Welcome, {session.user.name ?? session.user.email}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            {metrics.scope === "CHAPTER"
              ? `Operational snapshot for ${metrics.chapterName}.`
              : "Operational snapshot across all chapters (brief §39)."}
          </p>
        </div>

        {/* Brief §13 — global date-range filter. Plain GET form, no client JS,
            matching this project's established convention (Reports' period
            tabs, Member Search's filters). Only the "Selected period" tiles
            below respond to this — current-state tiles never do. */}
        <form method="GET" className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            Period
            <select
              name="range"
              defaultValue={range.preset}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            >
              {DATE_RANGE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            From
            <input
              type="date"
              name="from"
              defaultValue={range.preset === "custom" ? formatDate(range.from) : undefined}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
            To
            <input
              type="date"
              name="to"
              defaultValue={range.preset === "custom" ? formatDate(range.to) : undefined}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Apply
          </button>
        </form>
      </div>

      <div>
        <SectionLabel>Current state</SectionLabel>
        {metrics.scope === "CHAPTER" ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Tile label="Active members" value={metrics.activeMembers} />
            <Tile label="Upcoming meetings" value={metrics.upcomingMeetings} />
            <Tile label="Open category slots" value={metrics.openCategorySlots} hint="Active categories not yet held by an active member here" />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Active members" value={metrics.activeMembers} />
            <Tile label="Unique companies" value={metrics.totalCompanies} />
            <Tile label="Active chapters" value={metrics.activeChapters} />
            <Tile label="Open category slots" value={metrics.openCategorySlots} hint="Across all active chapters" />
            <Tile label="Pending membership approvals" value={metrics.pendingApplications} />
            <Tile label="Upcoming meetings" value={metrics.upcomingMeetings} />
            <Tile
              label="Published blogs"
              value={metrics.publishedBlogCount}
              hint={metrics.latestPublishedBlog ? `Latest: "${metrics.latestPublishedBlog.title}"` : "No posts published yet"}
            />
          </div>
        )}
      </div>

      <div>
        <SectionLabel>{range.label}</SectionLabel>
        {metrics.scope === "CHAPTER" ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Tile label="New visitor registrations" value={metrics.newVisitorsInPeriod} />
            <Tile label="New members" value={metrics.newMembersInPeriod} />
            <Tile label="Visitor → member conversions" value={metrics.conversionsInPeriod} />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="New visitor registrations" value={metrics.newVisitorsInPeriod} />
            <Tile label="Membership applications" value={metrics.newApplicationsInPeriod} />
            <Tile label="New members" value={metrics.newMembersInPeriod} />
            <Tile label="Visitor → member conversions / inductions" value={metrics.conversionsInPeriod} />
          </div>
        )}
      </div>

      {metrics.scope === "ALL" && permissions.has("audit_log:view") ? (
        // Brief §15 — collapsed by default (native <details>, no client JS)
        // rather than the previous always-open box; the full Activity Log
        // page is the authoritative place for this, not the dashboard.
        <details className="rounded-lg border border-neutral-200 bg-white p-6">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
            Recent admin activity ▼
          </summary>
          <div className="mt-4 flex flex-col divide-y divide-neutral-100">
            {metrics.recentActivity.length === 0 ? (
              <p className="py-2 text-sm text-neutral-400">No activity recorded yet.</p>
            ) : (
              metrics.recentActivity.map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-neutral-700">
                    {entry.userName ?? "System"} — {entry.action}
                    {entry.entity ? ` (${entry.entity})` : ""}
                  </span>
                  <span className="text-xs text-neutral-400">{entry.createdAt.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
          <Link href="/admin/activity" className="mt-3 inline-block text-sm text-neutral-500 hover:text-neutral-900">
            View full activity log →
          </Link>
        </details>
      ) : null}
    </div>
  );
}
