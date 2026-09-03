import Link from "next/link";
import { getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const isChapterAdmin = session.user.roles.includes("CHAPTER_ADMIN");
  const chapterId = session.user.chapterId ?? null;

  const metrics = await getDashboardMetrics(isChapterAdmin && chapterId ? chapterId : "ALL");
  const permissions = await getUserPermissionKeys(session.user.id);

  return (
    <div className="flex flex-col gap-8">
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

      {metrics.scope === "CHAPTER" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Tile label="Active members" value={metrics.activeMembers} />
          <Tile label="Visitors" value={metrics.totalVisitors} />
          <Tile label="New visitors this month" value={metrics.newVisitorsThisMonth} />
          <Tile label="Upcoming meetings" value={metrics.upcomingMeetings} />
          <Tile label="Upcoming events" value={metrics.upcomingEvents} />
          <Tile label="Open category slots" value={metrics.openCategorySlots} hint="Active categories not yet held by an active member here" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Active members" value={metrics.activeMembers} />
            <Tile label="Total companies" value={metrics.totalCompanies} />
            <Tile label="Active chapters" value={metrics.activeChapters} />
            <Tile label="Visitors" value={metrics.totalVisitors} />
            <Tile label="New visitors this month" value={metrics.newVisitorsThisMonth} />
            <Tile label="Membership applications" value={metrics.totalApplications} />
            <Tile label="Pending approvals" value={metrics.pendingApplications} />
            <Tile label="Upcoming meetings" value={metrics.upcomingMeetings} />
            <Tile label="Upcoming events" value={metrics.upcomingEvents} />
            <Tile label="Open category slots" value={metrics.openCategorySlots} hint="Across all active chapters" />
            <Tile
              label="Blog activity"
              value={metrics.publishedBlogCount}
              hint={metrics.latestPublishedBlog ? `Latest: "${metrics.latestPublishedBlog.title}"` : "No posts published yet"}
            />
            <Tile label="New chatbot leads" value={metrics.newChatbotLeads} hint="Ask BWF — not yet contacted" />
          </div>

          {permissions.has("audit_log:view") ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-neutral-900">Recent admin activity</h2>
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
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
