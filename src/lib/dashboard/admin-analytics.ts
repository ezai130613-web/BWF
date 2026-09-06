import { db } from "@/lib/db";

/**
 * Brief §51 — "Admin Analytics" ("Later" per the brief's own wording,
 * backlog #20). Most of what §51 actually asks for — website visitors,
 * most-viewed member profiles, most-searched categories, most-viewed
 * chapters, top blogs — is real-traffic data this app has never tracked
 * itself (that's GA4's job, brief §50, and no real GA4 property exists yet
 * either — backlog #19). Fabricating those from something else in the
 * database would be a fake number, not a smaller feature — this file
 * deliberately covers only the metrics honestly derivable from data the app
 * already has: the funnel `Lead` (brief §35, Phase 15) → `MembershipApplication`
 * → `Visitor` already tracks end to end. See the page component for how the
 * GA4-dependent metrics are surfaced instead (an honest "needs GA4" note,
 * not silently omitted).
 */

export type StatusBreakdown = { status: string; count: number }[];

export type AdminAnalytics = {
  enquiries: {
    total: number;
    bySource: { source: string; count: number }[];
    byStatus: StatusBreakdown;
  };
  applications: {
    total: number;
    byStatus: StatusBreakdown;
  };
  visitors: {
    total: number;
    byStatus: StatusBreakdown;
  };
  conversions: {
    /** Visitor.status === CONVERTED / total visitors. */
    visitorToConverted: number;
    /** MembershipApplication.status === PAID / total applications. */
    applicationToPaid: number;
    /** Lead.status === CONVERTED / total leads. */
    leadToConverted: number;
  };
};

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const [
    totalLeads,
    leadsBySource,
    leadsByStatus,
    totalApplications,
    applicationsByStatus,
    totalVisitors,
    visitorsByStatus,
    convertedVisitors,
    paidApplications,
    convertedLeads,
  ] = await Promise.all([
    db.lead.count(),
    db.lead.groupBy({ by: ["source"], _count: { _all: true } }),
    db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    db.membershipApplication.count(),
    db.membershipApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    db.visitor.count(),
    db.visitor.groupBy({ by: ["status"], _count: { _all: true } }),
    db.visitor.count({ where: { status: "CONVERTED" } }),
    db.membershipApplication.count({ where: { status: "PAID" } }),
    db.lead.count({ where: { status: "CONVERTED" } }),
  ]);

  return {
    enquiries: {
      total: totalLeads,
      bySource: leadsBySource.map((r) => ({ source: r.source, count: r._count._all })),
      byStatus: leadsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
    },
    applications: {
      total: totalApplications,
      byStatus: applicationsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
    },
    visitors: {
      total: totalVisitors,
      byStatus: visitorsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
    },
    conversions: {
      visitorToConverted: totalVisitors > 0 ? convertedVisitors / totalVisitors : 0,
      applicationToPaid: totalApplications > 0 ? paidApplications / totalApplications : 0,
      leadToConverted: totalLeads > 0 ? convertedLeads / totalLeads : 0,
    },
  };
}
