import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

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

/**
 * Spec §6: "Export Excel reports for visitor attendance by meeting/chapter/
 * person, invitations by member, acquisition sources, and visitor-to-member
 * conversions." One workbook, four sheets — same data source underlies all
 * four, so this stays one route rather than four near-identical ones.
 */
export async function GET(request: Request) {
  const scope = await getChapterScope("attendance:manage");
  const { searchParams } = new URL(request.url);

  const requestedChapterId = searchParams.get("chapterId");
  const chapterId = scope === "ALL" ? requestedChapterId || undefined : scope;
  const meetingId = searchParams.get("meetingId") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.VisitorAttendanceWhereInput = {
    ...(meetingId ? { meetingId } : chapterId ? { chapterId } : {}),
    ...(from || to
      ? {
          meeting: {
            ...(meetingId ? {} : chapterId ? { chapterId } : {}),
            startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) },
          },
        }
      : {}),
  };

  const rows = await db.visitorAttendance.findMany({
    where,
    include: { visitorProfile: true, chapter: true, meeting: true, invitingMember: { select: { name: true } } },
    orderBy: [{ meeting: { startsAt: "desc" } }, { visitorProfile: { name: "asc" } }],
  });

  const workbook = new ExcelJS.Workbook();

  const attendanceSheet = workbook.addWorksheet("Attendance");
  attendanceSheet.columns = [
    { header: "Chapter", key: "chapter", width: 16 },
    { header: "Meeting", key: "meeting", width: 24 },
    { header: "Meeting Date", key: "meetingDate", width: 16 },
    { header: "Visitor Name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Company", key: "company", width: 22 },
    { header: "Business Category", key: "category", width: 22 },
    { header: "Source", key: "source", width: 18 },
    { header: "Inviting Member", key: "inviter", width: 22 },
    { header: "Status", key: "status", width: 12 },
    { header: "Check-in Time", key: "checkedInAt", width: 20 },
  ];
  for (const row of rows) {
    attendanceSheet.addRow({
      chapter: row.chapter.name,
      meeting: row.meeting.title,
      meetingDate: row.meeting.startsAt.toLocaleDateString("en-IN"),
      name: row.visitorProfile.name,
      phone: row.visitorProfile.phone,
      company: row.visitorProfile.companyName ?? "",
      category: row.visitorProfile.businessCategory ?? "",
      source: SOURCE_LABELS[row.source] ?? row.source,
      inviter: row.invitingMember?.name ?? "",
      status: row.status,
      checkedInAt: row.checkedInAt ? row.checkedInAt.toLocaleString("en-IN") : "",
    });
  }

  const invitationsByMember = new Map<string, { uniqueVisitors: Set<string>; totalVisits: number }>();
  for (const row of rows) {
    if (row.source !== "INVITED_BY_MEMBER" || !row.invitingMember) continue;
    const entry = invitationsByMember.get(row.invitingMember.name) ?? { uniqueVisitors: new Set(), totalVisits: 0 };
    entry.uniqueVisitors.add(row.visitorProfileId);
    entry.totalVisits += 1;
    invitationsByMember.set(row.invitingMember.name, entry);
  }
  const invitationsSheet = workbook.addWorksheet("Invitations by Member");
  invitationsSheet.columns = [
    { header: "Member", key: "member", width: 26 },
    { header: "Unique Visitors", key: "unique", width: 16 },
    { header: "Total Visits", key: "total", width: 14 },
  ];
  for (const [member, entry] of invitationsByMember) {
    invitationsSheet.addRow({ member, unique: entry.uniqueVisitors.size, total: entry.totalVisits });
  }

  const sourceCounts = new Map<string, number>();
  for (const row of rows) sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
  const sourcesSheet = workbook.addWorksheet("Acquisition Sources");
  sourcesSheet.columns = [
    { header: "Source", key: "source", width: 20 },
    { header: "Visits", key: "count", width: 12 },
  ];
  for (const [source, count] of sourceCounts) {
    sourcesSheet.addRow({ source: SOURCE_LABELS[source] ?? source, count });
  }

  const convertedProfiles = await db.visitorProfile.findMany({
    where: { convertedMemberId: { not: null }, ...(chapterId ? { attendances: { some: { chapterId } } } : {}) },
    include: { convertedMember: { include: { chapter: true } } },
    orderBy: { name: "asc" },
  });
  const conversionsSheet = workbook.addWorksheet("Conversions");
  conversionsSheet.columns = [
    { header: "Visitor Name", key: "visitorName", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Converted Member", key: "memberName", width: 24 },
    { header: "Member Chapter", key: "chapter", width: 18 },
    { header: "Member Joined", key: "joinedAt", width: 16 },
  ];
  for (const profile of convertedProfiles) {
    conversionsSheet.addRow({
      visitorName: profile.name,
      phone: profile.phone,
      memberName: profile.convertedMember?.name ?? "",
      chapter: profile.convertedMember?.chapter.name ?? "",
      joinedAt: profile.convertedMember?.joinedAt.toLocaleDateString("en-IN") ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="visitor-attendance-export.xlsx"',
    },
  });
}
