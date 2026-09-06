import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";

export type ExportFormat = "csv" | "xlsx" | "pdf";

/**
 * Brief §44 — the exact four required fields for the Weekly Member Export.
 * "Recommended additional operational fields may exist internally but must
 * not alter requested export unless selected" — Chapter/Company are exactly
 * that: internal, useful, and only added when `includeExtra` is explicitly
 * checked (see /admin/exports), never on by default.
 */
export type MemberExportRow = {
  name: string;
  category: string;
  phone: string;
  status: string;
  chapter?: string;
  company?: string;
};

/** Single source of truth for the export's row set — used by both the on-demand /admin/exports route and (once Phase 13 wires sending) the weekly report. */
export async function buildMemberExportRows(
  chapterFilter: { chapterId?: string },
  includeExtra: boolean,
): Promise<MemberExportRow[]> {
  const members = await db.member.findMany({
    where: chapterFilter,
    include: { category: true, chapter: true, company: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

  return members.map((m) => ({
    name: m.name,
    category: m.category.name,
    phone: m.phone ?? "",
    status: m.status,
    ...(includeExtra ? { chapter: m.chapter.name, company: m.company.name } : {}),
  }));
}

function columnsFor(includeExtra: boolean): { key: keyof MemberExportRow; label: string }[] {
  const base: { key: keyof MemberExportRow; label: string }[] = [
    { key: "name", label: "Member Name" },
    { key: "category", label: "Category" },
    { key: "phone", label: "Phone Number" },
    { key: "status", label: "Membership Status" },
  ];
  if (includeExtra) {
    base.push({ key: "chapter", label: "Chapter" }, { key: "company", label: "Company" });
  }
  return base;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(rows: MemberExportRow[], includeExtra: boolean): string {
  const columns = columnsFor(includeExtra);
  const lines = [columns.map((c) => csvEscape(c.label)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => csvEscape(String(row[c.key] ?? ""))).join(","));
  }
  return lines.join("\n");
}

export async function toXlsxBuffer(rows: MemberExportRow[], includeExtra: boolean, title: string): Promise<Buffer> {
  const columns = columnsFor(includeExtra);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function toPdfBuffer(rows: MemberExportRow[], includeExtra: boolean, title: string): Promise<Buffer> {
  const columns = columnsFor(includeExtra);
  const columnWidth = 500 / columns.length;
  // Columns sit edge-to-edge with no gap between them, so a label/value
  // that nearly fills its column (found live: "Membership Status" measures
  // 82.9pt against an 83.3pt column in the 6-column layout) visually runs
  // straight into the next column's text with zero separation — not a
  // wrapping bug, a legibility one. Text is drawn `textWidth`-wide, always
  // narrower than the full column, while columns themselves stay
  // `columnWidth` apart so the table's total width and alignment don't
  // change.
  const columnGutter = 6;
  const textWidth = columnWidth - columnGutter;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(14).text(title, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#666").text(`Generated ${new Date().toLocaleString()} — ${rows.length} member(s)`);
    doc.moveDown(1);

    const startX = doc.x;
    let y = doc.y;
    const minRowHeight = 20;
    // Bottom of the printable area, not a magic number, so this stays
    // correct if the page size/margin ever changes.
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    function drawHeader() {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
      // Same fixed-height bug as the data rows, just for the header label
      // itself — found live once the gutter fix above pushed "Membership
      // Status" (6-column layout) just past its column's one-line width,
      // wrapping it to two lines that the old fixed minRowHeight didn't
      // reserve space for, so the divider line underneath overlapped it.
      const headerHeight = Math.max(minRowHeight, ...columns.map((c) => doc.heightOfString(c.label, { width: textWidth })));
      columns.forEach((c, i) => {
        doc.text(c.label, startX + i * columnWidth, y, { width: textWidth });
      });
      y += headerHeight;
      doc.moveTo(startX, y - 4).lineTo(startX + 500, y - 4).strokeColor("#ccc").stroke();
      doc.font("Helvetica").fontSize(9).fillColor("#000");
    }

    drawHeader();
    for (const row of rows) {
      const cellTexts = columns.map((c) => String(row[c.key] ?? ""));
      // Backlog #16 — a fixed 20pt row height silently overlapped whenever a
      // cell's real content (a long category/company name, mainly) wrapped
      // to more than one line within its narrow column: PDFKit wraps by
      // default (the `ellipsis: true` this replaced only truncates a
      // single line already constrained by `height`, which nothing here
      // set, so it never actually took effect). Measuring every cell's real
      // wrapped height and using the tallest is more correct than
      // truncating real operational data (company/category names) down to
      // whatever fits on one line — confirmed with a live 500-row export
      // containing genuinely long values, not just the ~4-row smoke test
      // this had before.
      const rowHeight = Math.max(minRowHeight, ...cellTexts.map((text) => doc.heightOfString(text, { width: textWidth })));

      if (y + rowHeight > pageBottom) {
        doc.addPage();
        y = doc.y;
        drawHeader();
      }
      columns.forEach((c, i) => {
        doc.text(cellTexts[i], startX + i * columnWidth, y, { width: textWidth });
      });
      y += rowHeight;
    }

    doc.end();
  });
}

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};
