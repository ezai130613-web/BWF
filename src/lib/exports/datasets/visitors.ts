import { db } from "@/lib/db";
import { chapterScope, effectiveChapterId, istDayEnd, istDayStart } from "../access";
import type { ExportDataset } from "./types";

const SOURCE_LABELS: Record<string, string> = {
  INVITED_BY_MEMBER: "Invited by member",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  GOOGLE_SEARCH: "Google Search",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  OTHER: "Other",
};

/** /admin/visitors — online "visit a meeting" registrations. */
const visitors: ExportDataset = {
  key: "visitors",
  title: "Visitor Registrations",
  scope: (a) => chapterScope(a, "visitors:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const rows = await db.visitor.findMany({
      where: chapterId ? { chapterId } : {},
      include: { category: true, chapter: true, meeting: true, referringMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return [
      {
        name: "Visitor Registrations",
        columns: [
          { header: "Registered", key: "registered", type: "datetime", width: 20 },
          { header: "Name", key: "name", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 26 },
          { header: "Company", key: "company", width: 24 },
          { header: "Designation", key: "designation", width: 18 },
          { header: "Category", key: "category", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Purpose", key: "purpose", width: 18 },
          { header: "Referred By", key: "referredBy", width: 22 },
          { header: "Status", key: "status", width: 22 },
          { header: "Payment Screenshot", key: "proof", type: "link", linkText: "Open proof" },
          { header: "Notes", key: "notes", width: 30 },
        ],
        rows: rows.map((v) => ({
          registered: v.createdAt,
          name: v.name,
          phone: v.phone,
          email: v.email,
          company: v.company,
          designation: v.designation,
          category: v.category.name,
          chapter: v.chapter.name,
          meeting: v.meeting?.title,
          purpose: v.purposeOfVisit?.replace(/_/g, " "),
          referredBy: v.referringMember?.name,
          status: v.status.replace(/_/g, " "),
          proof: v.paymentScreenshotUrl,
          notes: v.notes,
        })),
      },
    ];
  },
};

/** /admin/visitors-attendance — QR walk-in check-ins, plus the three summary sheets the old export had. */
const visitorAttendance: ExportDataset = {
  key: "visitor-attendance",
  title: "Visitor Attendance",
  scope: (a) => chapterScope(a, "attendance:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const meetingId = params.get("meetingId") || undefined;
    const from = istDayStart(params.get("from"));
    const to = istDayEnd(params.get("to"));

    const rows = await db.visitorAttendance.findMany({
      where: {
        AND: [
          chapterId ? { chapterId } : {},
          meetingId ? { meetingId } : {},
          from || to ? { meeting: { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } } : {},
        ],
      },
      include: {
        visitorProfile: true,
        chapter: true,
        meeting: true,
        invitingMember: { select: { name: true } },
        payment: { select: { status: true, amountInr: true } },
      },
      orderBy: [{ meeting: { startsAt: "desc" } }, { visitorProfile: { name: "asc" } }],
    });

    const invitationsByMember = new Map<string, { uniqueVisitors: Set<string>; totalVisits: number }>();
    const sourceCounts = new Map<string, number>();
    for (const row of rows) {
      sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
      if (row.source !== "INVITED_BY_MEMBER" || !row.invitingMember) continue;
      const entry = invitationsByMember.get(row.invitingMember.name) ?? { uniqueVisitors: new Set(), totalVisits: 0 };
      entry.uniqueVisitors.add(row.visitorProfileId);
      entry.totalVisits += 1;
      invitationsByMember.set(row.invitingMember.name, entry);
    }

    const conversions = await db.visitorProfile.findMany({
      where: { convertedMemberId: { not: null }, ...(chapterId ? { attendances: { some: { chapterId } } } : {}) },
      include: { convertedMember: { include: { chapter: true } } },
      orderBy: { name: "asc" },
    });

    return [
      {
        name: "Visitor Attendance",
        columns: [
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Meeting", key: "meeting", width: 26 },
          { header: "Meeting Date", key: "meetingDate", type: "date", width: 14 },
          { header: "Visitor", key: "name", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 24 },
          { header: "Company", key: "company", width: 24 },
          { header: "Business Category", key: "category", width: 22 },
          { header: "Source", key: "source", width: 18 },
          { header: "Inviting Member", key: "inviter", width: 22 },
          { header: "Status", key: "status", width: 12 },
          { header: "Check-in Time", key: "checkedInAt", type: "datetime", width: 20 },
          { header: "Payment", key: "payment", width: 20 },
          { header: "Amount (INR)", key: "amount", type: "money", width: 14 },
        ],
        rows: rows.map((row) => ({
          chapter: row.chapter.name,
          meeting: row.meeting.title,
          meetingDate: row.meeting.startsAt,
          name: row.visitorProfile.name,
          phone: row.visitorProfile.phone,
          email: row.visitorProfile.email,
          company: row.visitorProfile.companyName,
          category: row.visitorProfile.businessCategory,
          source: SOURCE_LABELS[row.source] ?? row.source,
          inviter: row.invitingMember?.name,
          status: row.status === "PRESENT" ? "Present" : "Absent",
          checkedInAt: row.checkedInAt,
          payment: row.payment ? row.payment.status.replace(/_/g, " ") : "Not submitted",
          amount: row.payment ? Number(row.payment.amountInr) : null,
        })),
      },
      {
        name: "Visitor Invitations by Member",
        columns: [
          { header: "Member", key: "member", width: 26 },
          { header: "Unique Visitors", key: "unique", type: "number" },
          { header: "Total Visits", key: "total", type: "number" },
        ],
        rows: [...invitationsByMember].map(([member, entry]) => ({
          member,
          unique: entry.uniqueVisitors.size,
          total: entry.totalVisits,
        })),
      },
      {
        name: "Visitor Sources",
        columns: [
          { header: "Source", key: "source", width: 20 },
          { header: "Visits", key: "count", type: "number" },
        ],
        rows: [...sourceCounts].map(([source, count]) => ({ source: SOURCE_LABELS[source] ?? source, count })),
      },
      {
        name: "Visitor Conversions",
        columns: [
          { header: "Visitor", key: "visitorName", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Converted Member", key: "memberName", width: 24 },
          { header: "Member Chapter", key: "chapter", width: 18 },
          { header: "Member Joined", key: "joinedAt", type: "date", width: 14 },
        ],
        rows: conversions.map((p) => ({
          visitorName: p.name,
          phone: p.phone,
          memberName: p.convertedMember?.name,
          chapter: p.convertedMember?.chapter.name,
          joinedAt: p.convertedMember?.joinedAt,
        })),
      },
    ];
  },
};

/** /admin/visitors-attendance/profiles — one row per visitor (deduplicated by phone). */
const visitorProfiles: ExportDataset = {
  key: "visitor-profiles",
  title: "Visitor Profiles",
  scope: (a) => chapterScope(a, "attendance:manage"),
  async load(scope) {
    const rows = await db.visitorProfile.findMany({
      where: scope === "ALL" ? {} : { attendances: { some: { chapterId: scope } } },
      include: {
        convertedMember: { select: { name: true } },
        attendances: { include: { meeting: { select: { startsAt: true } }, chapter: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    });
    return [
      {
        name: "Visitor Profiles",
        columns: [
          { header: "Name", key: "name", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 24 },
          { header: "Company", key: "company", width: 24 },
          { header: "Business Category", key: "category", width: 22 },
          { header: "Visits", key: "visits", type: "number" },
          { header: "Chapters Visited", key: "chapters", width: 24 },
          { header: "Last Visit", key: "lastVisit", type: "date", width: 14 },
          { header: "Became Member", key: "converted", width: 22 },
          { header: "First Seen", key: "created", type: "date", width: 14 },
        ],
        rows: rows.map((p) => {
          const visits = scope === "ALL" ? p.attendances : p.attendances.filter((a) => a.chapterId === scope);
          const last = visits.reduce<Date | null>((max, a) => (!max || a.meeting.startsAt > max ? a.meeting.startsAt : max), null);
          return {
            name: p.name,
            phone: p.phone,
            email: p.email,
            company: p.companyName,
            category: p.businessCategory,
            visits: visits.length,
            chapters: [...new Set(visits.map((a) => a.chapter.name))].join(", "),
            lastVisit: last,
            converted: p.convertedMember?.name,
            created: p.createdAt,
          };
        }),
      },
    ];
  },
};

/** /admin/contact-requests — same filters as the page. */
const contactRequests: ExportDataset = {
  key: "contact-requests",
  title: "Vendor Contact Requests",
  scope: (a) => chapterScope(a, "contact_requests:view"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const q = params.get("q")?.trim() || undefined;
    const from = istDayStart(params.get("from"));
    const to = istDayEnd(params.get("to"));
    const rows = await db.vendorContactRequest.findMany({
      where: {
        AND: [
          chapterId ? { member: { chapterId } } : {},
          q
            ? {
                OR: [
                  { requesterName: { contains: q, mode: "insensitive" } },
                  { requesterPhone: { contains: q } },
                  { member: { name: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {},
          from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
        ],
      },
      include: { member: { include: { chapter: true, category: true } } },
      orderBy: { createdAt: "desc" },
    });
    return [
      {
        name: "Contact Requests",
        columns: [
          { header: "Requested", key: "created", type: "datetime", width: 20 },
          { header: "Requester", key: "name", width: 24 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 24 },
          { header: "Requirement", key: "requirement", width: 40 },
          { header: "Member Contacted", key: "member", width: 24 },
          { header: "Member Category", key: "category", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
        ],
        rows: rows.map((r) => ({
          created: r.createdAt,
          name: r.requesterName,
          phone: r.requesterPhone,
          email: r.requesterEmail,
          requirement: r.requirement,
          member: r.member.name,
          category: r.member.category.name,
          chapter: r.member.chapter.name,
        })),
      },
    ];
  },
};

export const VISITOR_DATASETS = [visitors, visitorAttendance, visitorProfiles, contactRequests];
