import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatMonthsCovered } from "@/lib/attendance/manage";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";

/** Spec §5: "Export payments by chapter, meeting, member, payment date, covered month and approval status. Include secure proof references, not embedded sensitive screenshots." */
export async function GET(request: Request) {
  const scope = await getChapterScope("payments:view");
  const { searchParams } = new URL(request.url);

  const requestedChapterId = searchParams.get("chapterId");
  const chapterId = scope === "ALL" ? requestedChapterId || undefined : scope;
  const meetingId = searchParams.get("meetingId") || undefined;
  const memberQuery = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.PaymentWhereInput = {
    ...(chapterId ? { member: { chapterId } } : {}),
    ...(meetingId ? { meetingId } : {}),
    ...(memberQuery ? { member: { name: { contains: memberQuery, mode: "insensitive" } } } : {}),
    ...(status ? { status: status as PaymentApprovalStatus } : {}),
    ...(from || to ? { actualPaymentDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  };

  const rows = await db.payment.findMany({
    where,
    include: { member: { include: { chapter: true } }, meeting: true },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payments");
  sheet.columns = [
    { header: "Chapter", key: "chapter", width: 16 },
    { header: "Meeting", key: "meeting", width: 24 },
    { header: "Meeting Date", key: "meetingDate", width: 16 },
    { header: "Member Name", key: "member", width: 24 },
    { header: "Amount Paid (INR)", key: "amount", width: 16 },
    { header: "Months", key: "numberOfMonths", width: 10 },
    { header: "Covered Months", key: "covered", width: 30 },
    { header: "Actual Payment Date", key: "paymentDate", width: 18 },
    { header: "Status", key: "status", width: 20 },
    { header: "Proof Reference", key: "proof", width: 40 },
  ];

  for (const row of rows) {
    sheet.addRow({
      chapter: row.member.chapter.name,
      meeting: row.meeting.title,
      meetingDate: row.meeting.startsAt.toLocaleDateString("en-IN"),
      member: row.member.name,
      amount: Number(row.amountPaidInr),
      numberOfMonths: row.numberOfMonths,
      covered: formatMonthsCovered(row.monthsCovered),
      paymentDate: row.actualPaymentDate.toLocaleDateString("en-IN"),
      status: row.status,
      proof: row.proofUrl,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="payments-export.xlsx"',
    },
  });
}
