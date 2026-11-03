import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";

/**
 * Member payment invoice (2026-11-03). One A4 page: letterhead, invoice
 * number/dates, billed-to, a single line item, GST breakdown, amount in
 * words, and "Paid" — every invoice here is for money already received.
 * Sized to its content (no empty filler boxes).
 */

const GREEN = "#146c3a";
const GREEN_LIGHT = "#eef7f0";
const INK = "#1a1a1a";
const MUTED = "#666666";
const BORDER = "#d9d9d9";

export type InvoicePdfData = {
  number: string;
  issuedAt: Date;
  paidAt: Date;
  /** Shown as the title: "Tax Invoice" when the issuer has a GSTIN, else "Invoice". */
  issuer: { name: string; address: string | null; gstin: string | null; contact: string | null };
  billTo: { name: string; company: string | null; chapter: string; email: string | null; phone: string | null; address: string | null };
  description: string;
  detail: string | null;
  paymentMethod: string;
  reference: string | null;
  taxableInr: number;
  gstInr: number;
  gstPercent: number;
  totalInr: number;
  footerNote: string | null;
};

const inr = (n: number) =>
  "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const istDate = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? belowHundred(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering (lakh / crore): 24780.5 → "Twenty Four Thousand Seven Hundred Eighty Rupees and Fifty Paise Only". */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const parts: string[] = [];
  let n = rupees;
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  const words = `${parts.join(" ") || "Zero"} Rupees`;
  return `${words}${paise ? ` and ${belowHundred(paise)} Paise` : ""} Only`;
}

async function readLogo(): Promise<Buffer | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "images/brand/bwf-logo-512.png"));
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const logo = await readLogo();
  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Invoice ${data.number}`, Author: data.issuer.name } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = 48;
  const right = doc.page.width - 48;
  const width = right - left;

  // Letterhead
  let y = 48;
  let textX = left;
  if (logo) {
    try {
      doc.image(logo, left, y, { width: 52, height: 52 });
      textX = left + 64;
    } catch {
      /* unreadable logo never blocks the invoice */
    }
  }
  doc.font("Helvetica-Bold").fontSize(15).fillColor(GREEN).text(data.issuer.name, textX, y + 2, { width: 300 });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
  const issuerLines = [data.issuer.address, data.issuer.contact, data.issuer.gstin ? `GSTIN: ${data.issuer.gstin}` : null].filter(Boolean) as string[];
  if (issuerLines.length) doc.text(issuerLines.join("\n"), textX, doc.y + 3, { width: 300, lineGap: 1.5 });
  const letterheadBottom = Math.max(doc.y, y + 52);

  const title = data.issuer.gstin ? "TAX INVOICE" : "INVOICE";
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text(title, right - 200, y, { width: 200, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  const meta: [string, string][] = [
    ["Invoice no.", data.number],
    ["Invoice date", istDate(data.issuedAt)],
    ["Payment date", istDate(data.paidAt)],
  ];
  let my = y + 26;
  for (const [k, v] of meta) {
    doc.font("Helvetica").fillColor(MUTED).text(k, right - 200, my, { width: 90 });
    doc.font("Helvetica-Bold").fillColor(INK).text(v, right - 110, my, { width: 110, align: "right" });
    my += 13;
  }

  y = Math.max(letterheadBottom, my) + 14;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(GREEN).stroke();
  y += 14;

  // Billed to
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text("BILLED TO", left, y, { characterSpacing: 0.6 });
  y = doc.y + 3;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(data.billTo.name, left, y, { width: width / 2 });
  doc.font("Helvetica").fontSize(9).fillColor(INK);
  const billLines = [
    data.billTo.company,
    `Member, ${data.billTo.chapter}`,
    data.billTo.address,
    [data.billTo.phone, data.billTo.email].filter(Boolean).join(" · ") || null,
  ].filter(Boolean) as string[];
  doc.text(billLines.join("\n"), left, doc.y + 2, { width: width * 0.6, lineGap: 1.5 });
  y = doc.y + 18;

  // Line item table
  const amountCol = 110;
  const descWidth = width - amountCol - 20;
  doc.rect(left, y, width, 22).fillColor(GREEN).fill();
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  doc.text("DESCRIPTION", left + 10, y + 7, { width: descWidth });
  doc.text("AMOUNT", right - amountCol - 10, y + 7, { width: amountCol, align: "right" });
  y += 30;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(data.description, left + 10, y, { width: descWidth });
  if (data.detail) doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(data.detail, left + 10, doc.y + 2, { width: descWidth, lineGap: 1 });
  const descBottom = doc.y;
  doc.font("Helvetica").fontSize(10).fillColor(INK).text(inr(data.taxableInr), right - amountCol - 10, y, { width: amountCol, align: "right" });
  y = Math.max(descBottom, doc.y) + 10;
  doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor(BORDER).stroke();
  y += 10;

  // Totals
  const totalsX = right - 250;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9.5).fillColor(INK);
    doc.text(label, totalsX, y, { width: 140 });
    doc.text(value, right - amountCol - 10, y, { width: amountCol, align: "right" });
    y += bold ? 18 : 15;
  };
  row("Taxable value", inr(data.taxableInr));
  row(`GST @ ${data.gstPercent}%`, inr(data.gstInr));
  doc.rect(totalsX - 8, y - 4, right - totalsX + 8, 24).fillColor(GREEN_LIGHT).fill();
  y += 2;
  row("Total paid", inr(data.totalInr), true);
  y += 6;

  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text("Amount in words", left, y);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(amountInWords(data.totalInr), left, doc.y + 2, { width });
  y = doc.y + 14;

  // Payment
  doc.roundedRect(left, y, width, 38, 6).lineWidth(0.8).strokeColor(BORDER).stroke();
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text("Payment received", left + 12, y + 8);
  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(
    `${data.paymentMethod}${data.reference ? ` · Ref: ${data.reference}` : ""}`,
    left + 12,
    y + 21,
    { width: width - 120 },
  );
  doc.font("Helvetica-Bold").fontSize(12).fillColor(GREEN).text("PAID", right - 80, y + 13, { width: 68, align: "right" });
  y += 54;

  if (data.footerNote) {
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTED).text(data.footerNote, left, y, { width, align: "center" });
  }

  doc.end();
  return done;
}
