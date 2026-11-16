import { db } from "@/lib/db";
import type { ExportCell, ExportColumn } from "@/lib/exports/workbook";
import { getUnpaidRows, parseUnpaidFilters, type UnpaidFilters } from "./unpaid";
import { getPendingItems, parsePendingFilters, PENDING_STATUS_LABELS, type PendingFilters } from "./pending-items";
import type { PdfColumn } from "@/lib/auth/credentials-pdf";

/**
 * One definition per downloadable accounts report, feeding both the Excel
 * export (/api/admin/exports/<key>) and the PDF (/api/admin/exports/pdf).
 */
export type AccountsReport = {
  title: string;
  sheetName: string;
  note: string;
  columns: (ExportColumn & { pdfWidth: number })[];
  rows: Record<string, ExportCell>[];
};

const fmtDate = (key?: string) => (key ? new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "");

async function chapterName(chapterId?: string) {
  if (!chapterId) return "All chapters";
  return (await db.chapter.findUnique({ where: { id: chapterId }, select: { name: true } }))?.name ?? "Unknown chapter";
}

export async function unpaidReport(filters: UnpaidFilters, scopeChapterId?: string): Promise<AccountsReport> {
  const chapterId = scopeChapterId ?? filters.chapterId;
  const rows = await getUnpaidRows(filters, scopeChapterId);
  return {
    title: "Members who have not paid",
    sheetName: "Unpaid members",
    note: `${await chapterName(chapterId)} · ${fmtDate(filters.from)} to ${fmtDate(filters.to)} · ${rows.length} unpaid item(s)`,
    columns: [
      { header: "Chapter", key: "chapter", width: 18, pdfWidth: 100 },
      { header: "Member", key: "member", width: 28, pdfWidth: 160 },
      { header: "Phone", key: "phone", width: 15, pdfWidth: 90 },
      { header: "Category", key: "category", width: 26, pdfWidth: 150 },
      { header: "Fee", key: "kind", width: 18, pdfWidth: 100 },
      { header: "Period", key: "period", width: 16, pdfWidth: 90 },
      { header: "Status", key: "status", width: 18, pdfWidth: 80 },
    ],
    rows: rows.map((r) => ({ ...r })),
  };
}

export async function pendingItemsReport(filters: PendingFilters, scopeChapterId?: string): Promise<AccountsReport> {
  const chapterId = scopeChapterId ?? filters.chapterId;
  const items = await getPendingItems(filters, scopeChapterId);
  const range = filters.from || filters.to ? `${filters.from ? fmtDate(filters.from) : "start"} to ${filters.to ? fmtDate(filters.to) : "today"}` : "all dates";
  const asOn = new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
  const assignee =
    filters.assignedToUserId === "NONE"
      ? "unassigned"
      : filters.assignedToUserId
        ? ((await db.user.findUnique({ where: { id: filters.assignedToUserId }, select: { name: true } }))?.name ?? "unknown")
        : "everyone";
  return {
    title: "Pending points",
    sheetName: "Pending points",
    note: `As on ${asOn} · ${await chapterName(chapterId)} · assigned to ${assignee} · raised ${range} · ${items.length} point(s)`,
    columns: [
      { header: "Raised on", key: "raisedOn", type: "date", width: 14, pdfWidth: 70 },
      { header: "Chapter", key: "chapter", width: 16, pdfWidth: 70 },
      { header: "Pending point", key: "title", width: 40, pdfWidth: 170 },
      { header: "Details", key: "details", width: 40, pdfWidth: 110 },
      { header: "Assigned to", key: "assignedTo", width: 20, pdfWidth: 80 },
      { header: "Status", key: "status", width: 14, pdfWidth: 60 },
      { header: "Expected completion", key: "expectedOn", type: "date", width: 18, pdfWidth: 70 },
      { header: "Remarks", key: "remarks", width: 40, pdfWidth: 120 },
    ],
    rows: items.map((i) => ({
      raisedOn: i.raisedOn,
      chapter: i.chapter?.name ?? "All chapters",
      title: i.title,
      assignedTo: i.assignedTo?.name ?? "Unassigned",
      details: i.details,
      status: PENDING_STATUS_LABELS[i.status],
      expectedOn: i.expectedOn,
      remarks: i.remarks,
    })),
  };
}

export function reportToPdfInput(report: AccountsReport) {
  const columns: PdfColumn[] = report.columns.map((c) => ({ label: c.header, width: c.pdfWidth }));
  const date = (v: ExportCell) => (v instanceof Date ? v.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : String(v ?? ""));
  return {
    title: report.title,
    note: report.note,
    columns,
    rows: report.rows.map((r) => report.columns.map((c) => date(r[c.key]) || "")),
  };
}

export { parseUnpaidFilters, parsePendingFilters };
