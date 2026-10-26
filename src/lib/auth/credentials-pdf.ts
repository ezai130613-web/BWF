import PDFDocument from "pdfkit";

/**
 * Plain table PDFs for the Super Admin (2026-10-21): the member login sheet
 * produced right after issuing temporary passwords, and the admin account
 * list. Built on demand from data the caller already holds — nothing here
 * reads or stores credentials.
 */

const GREEN = "#14532d";
const INK = "#171717";
const MUTED = "#525252";
const RULE = "#d4d4d4";
const MARGIN = 36;
const ROW_HEIGHT = 20;

export type PdfColumn = { label: string; width: number; mono?: boolean };

function istNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

export function renderTablePdf(opts: { title: string; note: string; columns: PdfColumn[]; rows: string[][] }): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: MARGIN });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageBottom = doc.page.height - MARGIN;
  const totalWidth = opts.columns.reduce((sum, c) => sum + c.width, 0);

  function drawHeaderRow(y: number) {
    doc.rect(MARGIN, y, totalWidth, ROW_HEIGHT).fill(GREEN);
    let x = MARGIN;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    for (const col of opts.columns) {
      doc.text(col.label, x + 6, y + 6, { width: col.width - 12, lineBreak: false, ellipsis: true });
      x += col.width;
    }
    return y + ROW_HEIGHT;
  }

  doc.font("Helvetica-Bold").fontSize(16).fillColor(GREEN).text(opts.title, MARGIN, MARGIN);
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`Generated ${istNow()} IST · ${opts.rows.length} rows`);
  doc.moveDown(0.3).fillColor(INK).text(opts.note, { width: totalWidth });
  let y = drawHeaderRow(doc.y + 10);

  opts.rows.forEach((row, i) => {
    if (y + ROW_HEIGHT > pageBottom) {
      doc.addPage();
      y = drawHeaderRow(MARGIN);
    }
    if (i % 2 === 1) doc.rect(MARGIN, y, totalWidth, ROW_HEIGHT).fill("#f5f5f4");
    let x = MARGIN;
    opts.columns.forEach((col, c) => {
      doc.font(col.mono ? "Courier-Bold" : "Helvetica").fontSize(9).fillColor(INK);
      doc.text(row[c] ?? "", x + 6, y + 6, { width: col.width - 12, lineBreak: false, ellipsis: true });
      x += col.width;
    });
    doc.moveTo(MARGIN, y + ROW_HEIGHT).lineTo(MARGIN + totalWidth, y + ROW_HEIGHT).lineWidth(0.5).strokeColor(RULE).stroke();
    y += ROW_HEIGHT;
  });

  doc.end();
  return done;
}

export function memberCredentialsPdf(
  rows: { memberName: string; chapter: string; category: string; username: string; password: string }[],
) {
  return renderTablePdf({
    title: "BWF Member Login Credentials",
    note:
      "Confidential — share each row only with that member. Sign in at the member portal with the username and temporary password; " +
      "the member then verifies their email and sets a private password, and the temporary password stops working.",
    columns: [
      { label: "#", width: 30 },
      { label: "Member", width: 200 },
      { label: "Chapter", width: 90 },
      { label: "Category", width: 190 },
      { label: "Username", width: 130, mono: true },
      { label: "Temporary password", width: 130, mono: true },
    ],
    rows: rows.map((r, i) => [String(i + 1), r.memberName, r.chapter, r.category, r.username, r.password]),
  });
}

export function adminAccountsPdf(
  rows: { name: string; username: string | null; email: string | null; role: string; chapter: string | null; status: string; lastLogin: string }[],
) {
  return renderTablePdf({
    title: "BWF Admin Accounts",
    note: "Passwords are not included — they are stored only as one-way hashes. An admin who has lost access uses “Forgot password” on the admin login page.",
    columns: [
      { label: "#", width: 30 },
      { label: "Name", width: 140 },
      { label: "Username", width: 100, mono: true },
      { label: "Email", width: 170 },
      { label: "Role", width: 110 },
      { label: "Chapter", width: 80 },
      { label: "Status", width: 60 },
      { label: "Last login (IST)", width: 80 },
    ],
    rows: rows.map((r, i) => [String(i + 1), r.name, r.username?.toLowerCase() ?? "—", r.email ?? "—", r.role, r.chapter ?? "—", r.status, r.lastLogin]),
  });
}
