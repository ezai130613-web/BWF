import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma, PaymentApprovalStatus } from "@/generated/prisma/client";

/** Spec §6: "Export Excel reports for ... visitor payments." Same shape as the member payments export, minus the months-covered concept visitors don't have. */
export async function GET(request: Request) {
  const scope = await getChapterScope("payments:view");
  const { searchParams } = new URL(request.url);

  const requestedChapterId = searchParams.get("chapterId");
  const chapterId = scope === "ALL" ? requestedChapterId || undefined : scope;
  const meetingId = searchParams.get("meetingId") || undefined;
  const status = searchParams.get("status") || undefined;

  const where: Prisma.VisitorPaymentWhereInput = {
    visitorAttendance: {
      ...(meetingId ? { meetingId } : chapterId ? { chapterId } : {}),
    },
    ...(status ? { status: status as PaymentApprovalStatus } : {}),
  };

  const rows = await db.visitorPayment.findMany({
    where,
    include: { visitorAttendance: { include: { visitorProfile: true, chapter: true, meeting: true } } },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Visitor Payments");
  sheet.columns = [
    { header: "Chapter", key: "chapter", width: 16 },
    { header: "Meeting", key: "meeting", width: 24 },
    { header: "Meeting Date", key: "meetingDate", width: 16 },
    { header: "Visitor Name", key: "visitorName", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Amount Paid (INR)", key: "amount", width: 16 },
    { header: "Actual Payment Date", key: "paymentDate", width: 18 },
    { header: "Submitted", key: "submitted", width: 20 },
    { header: "Status", key: "status", width: 20 },
    { header: "Proof Reference", key: "proof", width: 40 },
  ];

  for (const row of rows) {
    sheet.addRow({
      chapter: row.visitorAttendance.chapter.name,
      meeting: row.visitorAttendance.meeting.title,
      meetingDate: row.visitorAttendance.meeting.startsAt.toLocaleDateString("en-IN"),
      visitorName: row.visitorAttendance.visitorProfile.name,
      phone: row.visitorAttendance.visitorProfile.phone,
      amount: Number(row.amountInr),
      paymentDate: row.actualPaymentDate.toLocaleDateString("en-IN"),
      submitted: row.createdAt.toLocaleString("en-IN"),
      status: row.status,
      proof: row.proofUrl,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="visitor-payments-export.xlsx"',
    },
  });
}
