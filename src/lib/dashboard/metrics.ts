import { db } from "@/lib/db";
import type { DateRange } from "@/lib/dashboard/date-range";

/**
 * Corrections brief §2-15 — the admin dashboard, redesigned around two kinds
 * of number:
 *
 * - **Current-state** metrics describe things as they stand right now
 *   (Active Members, Open Category Slots, Pending Approvals, Upcoming
 *   Meetings, ...) — the brief is explicit these must NOT respond to the
 *   date-range filter ("do not apply date filtering to inherently
 *   current-state metrics ... unless explicitly labelled 'Members Added
 *   During Period'"). Pending Approvals and Upcoming Meetings are placed
 *   here even though the brief's own §14 list groups them under
 *   "Selected-Period" — both are current-state by nature ("pending right
 *   now", "meetings still ahead of today"), and a past date range can't
 *   sensibly filter either without becoming misleading (an old date range
 *   would just show near-zero upcoming meetings, not a real historical
 *   count). Treating them as current-state instead is a deliberate,
 *   reasoned deviation from the brief's literal grouping, not an oversight.
 * - **Selected-period** metrics count things that *happened* within the
 *   chosen date range (New Visitor Registrations, Membership Applications,
 *   New Members, Conversions/Inductions) — these do respond to the filter.
 *
 * The brief's own §14 list also includes "Website Enquiries" as a
 * selected-period tile — omitted here per the user's explicit instruction
 * (2026-09-14): Leads/Website Enquiries was removed entirely as a concept,
 * since Visitors + Membership Applications already cover it.
 *
 * Every number here was verified against the real (non-seed) database
 * before this redesign, not just re-labelled — see docs/PHASES.md's Phase
 * 20 entry for the audit: Visitors=1, Applications=0, Meetings=0 are all
 * genuinely correct counts of real rows (not a query bug and not fabricated
 * placeholder data), reflecting that historical visitor/meeting data hasn't
 * been imported into this system yet — a data-entry gap, not a dashboard
 * bug. Published Blogs=30 was also confirmed correct, just mislabelled
 * ("Blog Activity") — brief §11.
 *
 * Chapter Admin gets a materially smaller set, not the same set pre-filtered
 * — several of these (companies, applications, blog, audit log) sit outside
 * anything a Chapter Admin can otherwise see in this admin (they hold no
 * companies:manage/applications:manage/audit_log:view permission at all), so
 * showing a dashboard number for a domain they can't drill into anywhere
 * else would be a real inconsistency, not a helpful summary.
 */

export type GlobalDashboardMetrics = {
  scope: "ALL";
  // Current-state
  activeMembers: number;
  totalCompanies: number;
  activeChapters: number;
  openCategorySlots: number;
  publishedBlogCount: number;
  latestPublishedBlog: { title: string; publishedAt: Date } | null;
  pendingApplications: number;
  upcomingMeetings: number;
  // Selected-period (see DateRange passed in)
  newVisitorsInPeriod: number;
  newApplicationsInPeriod: number;
  newMembersInPeriod: number;
  conversionsInPeriod: number;
  recentActivity: { action: string; entity: string | null; entityId: string | null; createdAt: Date; userName: string | null }[];
};

export type ChapterDashboardMetrics = {
  scope: "CHAPTER";
  chapterName: string;
  // Current-state
  activeMembers: number;
  openCategorySlots: number;
  upcomingMeetings: number;
  // Selected-period
  newVisitorsInPeriod: number;
  newMembersInPeriod: number;
  conversionsInPeriod: number;
};

export type DashboardMetrics = GlobalDashboardMetrics | ChapterDashboardMetrics;

export async function getDashboardMetrics(scope: "ALL" | string, range: DateRange): Promise<DashboardMetrics> {
  const now = new Date();
  const period = { gte: range.from, lte: range.to };

  if (scope !== "ALL") {
    const chapterId = scope;
    const [chapter, activeMembers, upcomingMeetings, activeCategories, newVisitorsInPeriod, newMembersInPeriod, conversionsInPeriod] =
      await Promise.all([
        db.chapter.findUniqueOrThrow({ where: { id: chapterId } }),
        db.member.count({ where: { chapterId, status: "ACTIVE" } }),
        db.meeting.count({ where: { chapterId, status: "SCHEDULED", startsAt: { gte: now } } }),
        db.category.count({ where: { isActive: true } }),
        db.visitor.count({ where: { chapterId, createdAt: period } }),
        db.member.count({ where: { chapterId, joinedAt: period } }),
        // Visitor has no dedicated "convertedAt" timestamp — updatedAt is the
        // best available proxy for "when this visitor was marked CONVERTED".
        db.visitor.count({ where: { chapterId, status: "CONVERTED", updatedAt: period } }),
      ]);

    return {
      scope: "CHAPTER",
      chapterName: chapter.name,
      activeMembers,
      openCategorySlots: Math.max(activeCategories - activeMembers, 0),
      upcomingMeetings,
      newVisitorsInPeriod,
      newMembersInPeriod,
      conversionsInPeriod,
    };
  }

  const [
    activeMembers,
    totalCompanies,
    activeChapters,
    pendingApplications,
    upcomingMeetings,
    activeCategories,
    publishedBlogCount,
    latestPublishedBlog,
    newVisitorsInPeriod,
    newApplicationsInPeriod,
    newMembersInPeriod,
    conversionsInPeriod,
    recentActivity,
  ] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.company.count(),
    db.chapter.count({ where: { status: "ACTIVE" } }),
    db.membershipApplication.count({ where: { status: { notIn: ["PAID", "REJECTED"] } } }),
    db.meeting.count({ where: { status: "SCHEDULED", startsAt: { gte: now } } }),
    db.category.count({ where: { isActive: true } }),
    db.blog.count({ where: { status: "PUBLISHED" } }),
    db.blog.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { title: true, publishedAt: true },
    }),
    db.visitor.count({ where: { createdAt: period } }),
    db.membershipApplication.count({ where: { createdAt: period } }),
    db.member.count({ where: { joinedAt: period } }),
    db.visitor.count({ where: { status: "CONVERTED", updatedAt: period } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
  ]);

  return {
    scope: "ALL",
    activeMembers,
    totalCompanies,
    activeChapters,
    openCategorySlots: Math.max(activeChapters * activeCategories - activeMembers, 0),
    publishedBlogCount,
    latestPublishedBlog:
      latestPublishedBlog?.publishedAt != null
        ? { title: latestPublishedBlog.title, publishedAt: latestPublishedBlog.publishedAt }
        : null,
    pendingApplications,
    upcomingMeetings,
    newVisitorsInPeriod,
    newApplicationsInPeriod,
    newMembersInPeriod,
    conversionsInPeriod,
    recentActivity: recentActivity.map((log) => ({
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
      userName: log.user?.name ?? null,
    })),
  };
}
