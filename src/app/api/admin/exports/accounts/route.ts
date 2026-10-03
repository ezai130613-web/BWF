import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requirePermission } from "@/lib/auth/rbac";
import { getLedgerRows, parseLedgerFilters, STATUS_LABELS } from "@/lib/accounts/ledger";

/** Phase 29 — Accounts workspace export: the same merged member + visitor ledger /admin/accounts shows, same filters, no row cap. Proof is a link reference, never an embedded file. */
export async function GET(request: Request) {
  await requirePermission("accounts:view");
  const { searchParams } = new URL(request.url);
  const filters = parseLedgerFilters(Object.fromEntries(searchParams));

  const rows = await getLedgerRows(filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("All Payments");
  sheet.columns = [
    { header: "Payment Date", key: "paymentDate", width: 14 },
    { header: "Submitted On", key: "submittedAt", width: 14 },
    { header: "Type", key: "type", width: 10 },
    { header: "Paid By", key: "payer", width: 24 },
    { header: "Contact", key: "contact", width: 16 },
    { header: "Chapter", key: "chapter", width: 14 },
    { header: "Purpose", key: "purpose", width: 40 },
    { header: "Meeting", key: "meeting", width: 24 },
    { header: "Meeting Date", key: "meetingDate", width: 14 },
    { header: "Amount (INR)", key: "amount", width: 14 },
    { header: "Status", key: "status", width: 22 },
    { header: "Reviewed By", key: "reviewedBy", width: 20 },
    { header: "Reviewed On", key: "reviewedAt", width: 14 },
    { header: "Remarks", key: "remarks", width: 30 },
    { header: "Proof Reference", key: "proof", width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      paymentDate: row.paymentDate.toLocaleDateString("en-IN"),
      submittedAt: row.submittedAt.toLocaleDateString("en-IN"),
      type: row.type === "MEMBER" ? "Member" : "Visitor",
      payer: row.payerName,
      contact: row.payerContact ?? "",
      chapter: row.chapterName,
      purpose: row.purpose,
      meeting: row.meetingTitle,
      meetingDate: row.meetingDate.toLocaleDateString("en-IN"),
      amount: row.amountInr,
      status: STATUS_LABELS[row.status],
      reviewedBy: row.reviewedBy ?? "",
      reviewedAt: row.reviewedAt ? row.reviewedAt.toLocaleDateString("en-IN") : "",
      remarks: row.reviewRemarks ?? "",
      proof: row.proofUrl,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bwf-accounts-payments.xlsx"',
    },
  });
}
