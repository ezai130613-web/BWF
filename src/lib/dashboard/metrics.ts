import { db } from "@/lib/db";

/**
 * Brief §39 — the admin dashboard's operational metrics. Only the base list
 * is implemented; the "Later:" items (business generated, referral count,
 * attendance, renewals, website performance) are explicitly future work and
 * deliberately not built early (brief §72). "New leads" is also omitted even
 * though it's in the base list — the Leads system (brief §35) has no phase
 * of its own yet (see docs/ARCHITECTURE.md), and this project's convention
 * (established in Phase 1) is an honest gap over a fabricated number.
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
  activeMembers: number;
  totalCompanies: number;
  activeChapters: number;
  totalVisitors: number;
  newVisitorsThisMonth: number;
  totalApplications: number;
  pendingApplications: number;
  upcomingMeetings: number;
  upcomingEvents: number;
  openCategorySlots: number;
  publishedBlogCount: number;
  latestPublishedBlog: { title: string; publishedAt: Date } | null;
  recentActivity: { action: string; entity: string | null; entityId: string | null; createdAt: Date; userName: string | null }[];
};

export type ChapterDashboardMetrics = {
  scope: "CHAPTER";
  chapterName: string;
  activeMembers: number;
  totalVisitors: number;
  newVisitorsThisMonth: number;
  upcomingMeetings: number;
  upcomingEvents: number;
  openCategorySlots: number;
};

export type DashboardMetrics = GlobalDashboardMetrics | ChapterDashboardMetrics;

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getDashboardMetrics(scope: "ALL" | string): Promise<DashboardMetrics> {
  const now = new Date();
  const monthStart = startOfMonth();

  if (scope !== "ALL") {
    const chapterId = scope;
    const [chapter, activeMembers, totalVisitors, newVisitorsThisMonth, upcomingMeetings, upcomingEvents, activeCategories] =
      await Promise.all([
        db.chapter.findUniqueOrThrow({ where: { id: chapterId } }),
        db.member.count({ where: { chapterId, status: "ACTIVE" } }),
        db.visitor.count({ where: { chapterId } }),
        db.visitor.count({ where: { chapterId, createdAt: { gte: monthStart } } }),
        db.meeting.count({ where: { chapterId, status: "SCHEDULED", startsAt: { gte: now } } }),
        db.event.count({ where: { chapterId, status: "SCHEDULED", startsAt: { gte: now } } }),
        db.category.count({ where: { isActive: true } }),
      ]);

    return {
      scope: "CHAPTER",
      chapterName: chapter.name,
      activeMembers,
      totalVisitors,
      newVisitorsThisMonth,
      upcomingMeetings,
      upcomingEvents,
      openCategorySlots: Math.max(activeCategories - activeMembers, 0),
    };
  }

  const [
    activeMembers,
    totalCompanies,
    activeChapters,
    totalVisitors,
    newVisitorsThisMonth,
    totalApplications,
    pendingApplications,
    upcomingMeetings,
    upcomingEvents,
    activeCategories,
    publishedBlogCount,
    latestPublishedBlog,
    recentActivity,
  ] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.company.count(),
    db.chapter.count({ where: { status: "ACTIVE" } }),
    db.visitor.count(),
    db.visitor.count({ where: { createdAt: { gte: monthStart } } }),
    db.membershipApplication.count(),
    db.membershipApplication.count({ where: { status: { notIn: ["PAID", "REJECTED"] } } }),
    db.meeting.count({ where: { status: "SCHEDULED", startsAt: { gte: now } } }),
    db.event.count({ where: { status: "SCHEDULED", startsAt: { gte: now } } }),
    db.category.count({ where: { isActive: true } }),
    db.blog.count({ where: { status: "PUBLISHED" } }),
    db.blog.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: { title: true, publishedAt: true },
    }),
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
    totalVisitors,
    newVisitorsThisMonth,
    totalApplications,
    pendingApplications,
    upcomingMeetings,
    upcomingEvents,
    openCategorySlots: Math.max(activeChapters * activeCategories - activeMembers, 0),
    publishedBlogCount,
    latestPublishedBlog:
      latestPublishedBlog?.publishedAt != null
        ? { title: latestPublishedBlog.title, publishedAt: latestPublishedBlog.publishedAt }
        : null,
    recentActivity: recentActivity.map((log) => ({
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
      userName: log.user?.name ?? null,
    })),
  };
}
