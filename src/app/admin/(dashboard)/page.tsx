import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  History,
  LineChart,
  Tags,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { WORKSPACE_HOME, fixedWorkspaceFor } from "@/lib/auth/constants";
import { getUserPermissionKeys, requireAdminSession } from "@/lib/auth/rbac";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { DATE_RANGE_PRESETS, resolveDateRange } from "@/lib/dashboard/date-range";
import { Card, EmptyState, StatTile, inputClass, primaryButtonClass } from "@/components/member/ui";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{children}</h2>;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type QuickAction = { href: string; label: string; hint: string; icon: LucideIcon; permission: string; chapterScoped?: boolean };

// Same permission keys as the sidebar (nav-config.ts); chapterScoped ones are
// also shown to Chapter Admin, whose access to them is limited to their chapter.
const QUICK_ACTIONS: QuickAction[] = [
  { href: "/admin/members", label: "Members", hint: "Add, edit or deactivate", icon: Users, permission: "members:manage", chapterScoped: true },
  { href: "/admin/applications", label: "Applications", hint: "Review membership requests", icon: FileText, permission: "applications:manage" },
  { href: "/admin/meetings", label: "Meetings", hint: "Schedule chapter meetings", icon: CalendarDays, permission: "meetings:manage", chapterScoped: true },
  { href: "/admin/visitors", label: "Visitors", hint: "Follow up registrations", icon: UserPlus, permission: "visitors:manage", chapterScoped: true },
  { href: "/admin/blogs", label: "Blog", hint: "Write and publish posts", icon: BookOpen, permission: "blogs:manage" },
  { href: "/admin/app-activity", label: "BWF App Activity", hint: "Referrals, slips and more", icon: Activity, permission: "app_activity:view", chapterScoped: true },
];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await requireAdminSession();
  // proxy.ts already redirects here, this is the backstop — the global
  // metrics below aren't for single-workspace logins (except Website Admin, whose home this is).
  const fixedWorkspace = fixedWorkspaceFor(session.user.roles);
  if (fixedWorkspace && fixedWorkspace !== "website") redirect(WORKSPACE_HOME[fixedWorkspace]);
  const isChapterAdmin = session.user.roles.includes("CHAPTER_ADMIN");
  const chapterId = session.user.chapterId ?? null;

  const params = await searchParams;
  const range = resolveDateRange(params);

  const metrics = await getDashboardMetrics(isChapterAdmin && chapterId ? chapterId : "ALL", range);
  const permissions = await getUserPermissionKeys(session.user.id);

  const quickActions = QUICK_ACTIONS.filter((a) => permissions.has(a.permission) || (isChapterAdmin && a.chapterScoped)).slice(0, 4);
  const firstName = (session.user.name ?? session.user.email ?? "Admin").split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — same treatment as the member portal dashboard */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 p-6 text-ivory-100 shadow-md sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-500/10 blur-2xl" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">Welcome back</p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl">{firstName}</h1>
            <p className="mt-2 text-sm text-ivory-200/85">
              {metrics.scope === "CHAPTER"
                ? `Operational snapshot for ${metrics.chapterName}.`
                : "Operational snapshot across all chapters."}
            </p>
          </div>
          {metrics.scope === "ALL" && permissions.has("applications:manage") ? (
            <Link
              href="/admin/applications"
              className="group flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
            >
              <FileText className="h-8 w-8 text-gold-400" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wide text-ivory-200/75">Pending approvals</p>
                <p className="text-3xl font-semibold text-white">{metrics.pendingApplications}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-ivory-200/70 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </section>

      {/* Quick actions */}
      {quickActions.length > 0 ? (
        <section aria-labelledby="quick-actions">
          <h2 id="quick-actions" className="sr-only">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickActions.map((a, i) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md sm:p-5"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    i === 0 ? "bg-emerald-800 text-gold-300" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <a.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-neutral-900">{a.label}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">{a.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <SectionLabel>Current state</SectionLabel>
        {metrics.scope === "CHAPTER" ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="Active members" value={metrics.activeMembers} icon={Users} />
            <StatTile label="Upcoming meetings" value={metrics.upcomingMeetings} icon={CalendarDays} />
            <StatTile label="Open category slots" value={metrics.openCategorySlots} icon={Tags} hint="Active categories not yet held by an active member here" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Active members" value={metrics.activeMembers} icon={Users} />
            <StatTile label="Unique companies" value={metrics.totalCompanies} icon={Briefcase} />
            <StatTile label="Active chapters" value={metrics.activeChapters} icon={Building2} />
            <StatTile label="Open category slots" value={metrics.openCategorySlots} icon={Tags} hint="Across all active chapters" />
            <StatTile label="Pending approvals" value={metrics.pendingApplications} icon={FileText} />
            <StatTile label="Upcoming meetings" value={metrics.upcomingMeetings} icon={CalendarDays} />
            <StatTile
              label="Published blogs"
              value={metrics.publishedBlogCount}
              icon={BookOpen}
              hint={metrics.latestPublishedBlog ? `Latest: "${metrics.latestPublishedBlog.title}"` : "No posts published yet"}
            />
          </div>
        )}
      </section>

      <Card
        title={range.label}
        icon={LineChart}
        description="Only these figures follow the selected period."
        action={
          // Brief §13 — global date-range filter. Plain GET form, no client JS,
          // matching this project's established convention (Reports' period
          // tabs, Member Search's filters).
          <form method="GET" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Period
              <select name="range" defaultValue={range.preset} className={`${inputClass} py-2`}>
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
                className={`${inputClass} py-2`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              To
              <input
                type="date"
                name="to"
                defaultValue={range.preset === "custom" ? formatDate(range.to) : undefined}
                className={`${inputClass} py-2`}
              />
            </label>
            <button type="submit" className={`${primaryButtonClass} py-2`}>
              Apply
            </button>
          </form>
        }
      >
        {metrics.scope === "CHAPTER" ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile label="New visitor registrations" value={metrics.newVisitorsInPeriod} icon={UserPlus} />
            <StatTile label="New members" value={metrics.newMembersInPeriod} icon={Users} />
            <StatTile label="Visitor → member conversions" value={metrics.conversionsInPeriod} icon={UserCheck} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="New visitor registrations" value={metrics.newVisitorsInPeriod} icon={UserPlus} />
            <StatTile label="Membership applications" value={metrics.newApplicationsInPeriod} icon={FileText} />
            <StatTile label="New members" value={metrics.newMembersInPeriod} icon={Users} />
            <StatTile label="Conversions / inductions" value={metrics.conversionsInPeriod} icon={UserCheck} />
          </div>
        )}
      </Card>

      {metrics.scope === "ALL" && permissions.has("audit_log:view") ? (
        <Card
          title="Recent admin activity"
          icon={History}
          action={
            <Link href="/admin/activity" className="text-xs font-medium text-emerald-800 hover:underline">
              Full activity log →
            </Link>
          }
          bodyClassName="px-5 py-2 sm:px-6"
        >
          {metrics.recentActivity.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100">
              {metrics.recentActivity.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                  <span className="text-neutral-700">
                    {entry.userName ?? "System"} — {entry.action}
                    {entry.entity ? ` (${entry.entity})` : ""}
                  </span>
                  <span className="text-xs text-neutral-400">{entry.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
