import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { IST_TIME_ZONE } from "@/lib/ist";

/**
 * Phase 36 — one Excel writer for every admin download. Each export
 * describes its sheets as plain columns + row objects; this file owns the
 * formatting (bold frozen header, filter arrows, IST dates, clickable links)
 * so every download looks and behaves the same.
 *
 * `link` columns become real hyperlinks (e.g. "Open proof" → the payment
 * screenshot), so an accounts reviewer can verify proofs straight from the
 * spreadsheet. Only http(s) URLs are linked; anything else is written as
 * plain text.
 */

export type ExportColumnType = "text" | "number" | "money" | "date" | "datetime" | "link";

export type ExportColumn = {
  header: string;
  key: string;
  width?: number;
  type?: ExportColumnType;
  /** For `link` columns: the visible text (default "Open"). */
  linkText?: string;
};

export type ExportCell = string | number | boolean | Date | null | undefined;

export type ExportSheet = {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, ExportCell>[];
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { timeZone: IST_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" };
const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { ...DATE_FORMAT, hour: "2-digit", minute: "2-digit", hour12: true };

/** Dates are written as IST text, not Excel serials — Excel has no time zone, so a raw UTC Date would show the wrong day for evening IST times. */
function formatCell(value: ExportCell, type: ExportColumnType): ExcelJS.CellValue {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return value.toLocaleString("en-IN", type === "datetime" ? DATETIME_FORMAT : DATE_FORMAT);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if ((type === "number" || type === "money") && typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

/** Excel sheet names: max 31 chars, none of \ / ? * [ ] : — and unique within a workbook. */
function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sheet";
  let candidate = base;
  for (let i = 2; used.has(candidate.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function buildWorkbook(sheets: ExportSheet[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Builders World Forum";
  workbook.created = new Date();
  const usedNames = new Set<string>();

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(safeSheetName(spec.name, usedNames), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 4) }));
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1EC" } };

    for (const row of spec.rows) {
      const values: Record<string, ExcelJS.CellValue> = {};
      for (const column of spec.columns) {
        const raw = row[column.key];
        const type = column.type ?? "text";
        if (type === "link") {
          const url = typeof raw === "string" ? raw.trim() : "";
          values[column.key] = /^https?:\/\//i.test(url) ? { text: column.linkText ?? "Open", hyperlink: url } : url || null;
        } else {
          values[column.key] = formatCell(raw, type);
        }
      }
      const added = sheet.addRow(values);
      spec.columns.forEach((column, i) => {
        const cell = added.getCell(i + 1);
        if (column.type === "money") cell.numFmt = "#,##0.00";
        if (column.type === "link" && typeof cell.value === "object" && cell.value !== null) {
          cell.font = { color: { argb: "FF1D4ED8" }, underline: true };
        }
      });
    }

    if (spec.rows.length > 0) {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spec.columns.length } };
    } else {
      sheet.addRow([]);
      sheet.addRow(["No records."]);
    }
  }

  if (sheets.length === 0) {
    workbook.addWorksheet("Export").addRow(["Nothing to export."]);
  }
  return workbook;
}

/** `bwf-<name>-YYYY-MM-DD.xlsx`, dated in IST. */
export function exportFilename(name: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: IST_TIME_ZONE });
  return `bwf-${name}-${today}.xlsx`;
}

export async function xlsxResponse(sheets: ExportSheet[], filename: string): Promise<NextResponse> {
  const buffer = await buildWorkbook(sheets).xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
