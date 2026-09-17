import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Spec §5: "Export attendance to Excel by chapter, meeting, member and date
 * range." Scope is re-derived from the session, same discipline as every
 * other authenticated export/query in this app (registerVisitor,
 * submitApplication, the old member-export route) — a requested chapterId
 * in the query string is only honored when the caller actually holds the
 * blanket permission.
 */
export async function GET(request: Request) {
  const scope = await getChapterScope("attendance:manage");
  const { searchParams } = new URL(request.url);

  const requestedChapterId = searchParams.get("chapterId");
  const chapterId = scope === "ALL" ? requestedChapterId || undefined : scope;
  const meetingId = searchParams.get("meetingId") || undefined;
  const memberQuery = searchParams.get("q") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.AttendanceWhereInput = {
    ...(meetingId ? { meetingId } : chapterId ? { meeting: { chapterId } } : {}),
    ...(memberQuery ? { member: { name: { contains: memberQuery, mode: "insensitive" } } } : {}),
    ...(from || to
      ? {
          meeting: {
            ...(meetingId ? {} : chapterId ? { chapterId } : {}),
            startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) },
          },
        }
      : {}),
  };

  const rows = await db.attendance.findMany({
    where,
    include: { member: { include: { chapter: true, category: true } }, meeting: true },
    orderBy: [{ meeting: { startsAt: "desc" } }, { member: { name: "asc" } }],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");
  sheet.columns = [
    { header: "Chapter", key: "chapter", width: 16 },
    { header: "Meeting", key: "meeting", width: 24 },
    { header: "Meeting Date", key: "meetingDate", width: 16 },
    { header: "Member Name", key: "member", width: 24 },
    { header: "Category", key: "category", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Check-in Time", key: "checkedInAt", width: 20 },
  ];

  for (const row of rows) {
    sheet.addRow({
      chapter: row.member.chapter.name,
      meeting: row.meeting.title,
      meetingDate: row.meeting.startsAt.toLocaleDateString("en-IN"),
      member: row.member.name,
      category: row.member.category.name,
      status: row.status,
      checkedInAt: row.checkedInAt ? row.checkedInAt.toLocaleString("en-IN") : "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="attendance-export.xlsx"',
    },
  });
}
