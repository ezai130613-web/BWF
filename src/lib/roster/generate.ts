import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import {
  GUEST_SELF_INTRODUCTION_HEADING,
  GUEST_SELF_INTRODUCTION_INSTRUCTIONS,
  GUEST_SELF_INTRODUCTION_LINES,
  GUEST_SELF_INTRODUCTION_SALUTATION,
  PLEDGE_HEADING,
  PLEDGE_LINES,
} from "./static-content";

/**
 * Roster Sheet PDF generator. Phase 20 Batch 3 built the first version;
 * this is the 2026-09-15 design correction that brings it back in line with
 * the 3 real reference roster PDFs (docs/reference/roster-sheets/) — the
 * client's brief was explicit that the first version had drifted into a
 * "database export" look instead of "the existing BWF roster, automated."
 * Five sections: cover, coordinators, member table, and one consolidated
 * final page. The reference PDFs' own invitation-flyer page (only ever on
 * one of the three reference chapters) is deliberately NOT reproduced here —
 * client correction: that's a separate promotional asset, not part of the
 * roster booklet.
 *
 * Still deliberately not a pixel-perfect recreation (drop shadows, gradient
 * fills) — pdfkit is a low-level drawing API and reproducing that exactly
 * would be a large, separate design effort. This matches the reference's
 * actual structure, density, and green/white identity closely enough that
 * it reads as the same booklet, automated.
 */

const GREEN = "#146c3a";
const GREEN_DARK = "#0d5c30";
const GREEN_LIGHT = "#eef7f0";
const GREEN_PALE = "#dcf0e2";
const INK = "#1a1a1a";
const MUTED = "#666666";
const BORDER = "#d9d9d9";
const WHITE = "#ffffff";

const PAGE_MARGIN = 40;
const MEMBERS_PER_PAGE = 8;

export type RosterMemberRow = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  photoUrl: string | null;
  company: string;
  category: string;
};

export type RosterAssociateGroup = "PRESIDENT" | "SECRETARY" | "TREASURER";

export type RosterAssignmentRow = {
  group: RosterAssociateGroup;
  roleLabel: string;
  memberName: string;
  photoUrl: string | null;
};

export type RosterLeadershipRow = {
  roleKey: string;
  roleLabel: string;
  memberName: string;
  photoUrl: string | null;
};

export type RosterChiefGuestRow = {
  name: string;
  photoUrl: string | null;
  company: string | null;
  designation: string | null;
};

export type RosterData = {
  chapterName: string;
  leadership: RosterLeadershipRow[];
  roleAssignments: RosterAssignmentRow[];
  /// Already in the order this roster should print in — the "All Other
  /// Members" section is pre-ranked by saved score (src/lib/roster/manage.ts
  /// / the roster_scores.order column), not resorted here.
  members: RosterMemberRow[];
  chiefGuests: RosterChiefGuestRow[];
  openCategoryNames: string[];
  whatsInItForYou: string;
  visitorFeedbackQrUrl: string | null;
  /// 2026-09-16 correction (client follow-up) — a per-meeting toggle for a
  /// single blank Notes box on the final page, printed before the Guest
  /// Self-Introduction block, once the full member list is done. Not a
  /// per-member column — an earlier pass put it next to Give/Ask on every
  /// row and the client corrected that.
  notesEnabled: boolean;
};

/** Same-origin `/…` paths read from `public/`; `http(s)://` fetched remotely — matches PhotoSlot's own local-vs-remote distinction. Never throws: a broken photo must never crash the whole PDF. */
async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    const filePath = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}

/**
 * Draws a rounded-square photo at (x,y) — the reference roster's own frame
 * shape for every photo (cover, coordinators, member table), not a circle.
 * Falls back to an initials placeholder when `buffer` is null so a missing
 * photo never blocks generation.
 */
function drawPhoto(doc: PDFKit.PDFDocument, buffer: Buffer | null, x: number, y: number, size: number, name: string, opts: { radius?: number; borderColor?: string } = {}) {
  const radius = opts.radius ?? size * 0.12;

  doc.save();
  doc.roundedRect(x, y, size, size, radius).clip();
  let drew = false;
  if (buffer) {
    try {
      doc.image(buffer, x, y, { width: size, height: size, cover: [size, size] as [number, number] });
      drew = true;
    } catch {
      drew = false;
    }
  }
  if (!drew) {
    doc.rect(x, y, size, size).fillColor("#e5e7eb").fill();
  }
  doc.restore();

  if (!drew) {
    doc
      .fillColor("#6b7280")
      .font("Helvetica-Bold")
      .fontSize(size / 2.4)
      .text(initialsFor(name), x, y + size / 2 - size / 5, { width: size, align: "center" });
  }

  doc.roundedRect(x, y, size, size, radius).lineWidth(1.5).strokeColor(opts.borderColor ?? WHITE).stroke();
  doc.fillColor(INK).font("Helvetica");
}

/**
 * One-line, center-aligned caption under a photo — forces truncation
 * (`height` + `ellipsis`) instead of letting a long name wrap onto a
 * second line and collide with the caption below it, the same overlap bug
 * the old member-export.ts PDF hit with fixed-height rows (backlog #16).
 */
function drawCaption(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, opts: { bold?: boolean; size?: number; color?: string; align?: "left" | "center" | "right" } = {}) {
  const size = opts.size ?? 9;
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(opts.color ?? INK);
  doc.text(text, x, y, { width, align: opts.align ?? "center", height: size + 2, ellipsis: true });
  doc.fillColor(INK).font("Helvetica");
}

function drawLogoBadge(doc: PDFKit.PDFDocument, x: number, y: number, logoBuffer: Buffer | null, color: string = GREEN) {
  let textX = x;
  if (logoBuffer) {
    const size = 26;
    try {
      doc.image(logoBuffer, x, y - 2, { width: size, height: size, cover: [size, size] as [number, number] });
      textX = x + size + 8;
    } catch {
      /* a corrupt/unreadable logo buffer must never crash the whole PDF */
    }
  }
  doc
    .fontSize(9)
    .fillColor(color)
    .font("Helvetica-Bold")
    .text("BUILDERS WORLD FORUM", textX, y, { characterSpacing: 0.4 });
  doc.fontSize(7).fillColor(color === GREEN ? MUTED : color).font("Helvetica-Oblique").text("Exclusive Forum for Construction Industry", textX, y + 12);
  doc.font("Helvetica").fillColor(INK);
}

/** Full-bleed, very light diagonal line texture — the reference roster's own subtle background pattern on every non-final page. Deliberately low-contrast (thin, pale lines) so it never competes with foreground content. */
function drawPatternBackground(doc: PDFKit.PDFDocument) {
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.rect(0, 0, w, h).fillColor(GREEN_LIGHT).fill();
  doc.opacity(0.35);
  doc.strokeColor("#ffffff").lineWidth(1);
  const step = 16;
  for (let offset = -h; offset < w + h; offset += step) {
    doc.moveTo(offset, 0).lineTo(offset + h, h).stroke();
  }
  doc.restore();
  doc.fillColor(INK).opacity(1);
}

/** A green rounded pill with centered white text, overlapping the top edge of whatever panel it labels — the reference's recurring section-header treatment ("Chief Guests", "Open Categories", associates column headers). */
function drawPill(doc: PDFKit.PDFDocument, text: string, cx: number, y: number, opts: { width?: number; fill?: string; textColor?: string } = {}) {
  const fill = opts.fill ?? GREEN;
  const textColor = opts.textColor ?? WHITE;
  doc.font("Helvetica-Bold").fontSize(10.5);
  const width = opts.width ?? doc.widthOfString(text) + 32;
  const height = 22;
  const x = cx - width / 2;
  doc.roundedRect(x, y, width, height, height / 2).fillColor(fill).fill();
  doc.fillColor(textColor).text(text, x, y + 6, { width, align: "center" });
  doc.fillColor(INK).font("Helvetica");
  return { x, y, width, height };
}

async function renderCover(doc: PDFKit.PDFDocument, data: RosterData, logoBuffer: Buffer | null) {
  const fullWidth = doc.page.width;
  const width = fullWidth - PAGE_MARGIN * 2;
  let y = 0;

  drawPatternBackground(doc);

  // Full-bleed Date/Name fill-in header, exactly as printed on the reference sheets — hand-filled at the meeting, not pre-populated.
  doc.rect(0, y, fullWidth, 40).fillColor(GREEN).fill();
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(11);
  doc.text("Date:", PAGE_MARGIN, y + 13);
  doc.roundedRect(PAGE_MARGIN + 50, y + 8, 160, 24, 4).fillColor(WHITE).fill();
  doc.fillColor(WHITE).text("Name:", PAGE_MARGIN + 240, y + 13);
  doc.roundedRect(PAGE_MARGIN + 290, y + 8, fullWidth - PAGE_MARGIN - 300, 24, 4).fillColor(WHITE).fill();
  doc.fillColor(INK).font("Helvetica");
  y += 56;

  drawLogoBadge(doc, PAGE_MARGIN, y, logoBuffer);
  doc.roundedRect(fullWidth - PAGE_MARGIN - 76, y, 76, 22, 11).fillColor(GREEN).fill();
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10).text("ROSTER", fullWidth - PAGE_MARGIN - 76, y + 6, { width: 76, align: "center" });
  doc.fillColor(INK).font("Helvetica");
  y += 42;

  doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(`${data.chapterName.toUpperCase()} MEETING`, PAGE_MARGIN, y, { width, align: "center" });
  y += 20;
  doc.font("Helvetica-Bold").fontSize(15);
  const tagline = "NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS";
  const taglineHeight = doc.heightOfString(tagline, { width, align: "center" });
  doc.text(tagline, PAGE_MARGIN, y, { width, align: "center" });
  y += taglineHeight + 16;
  doc.font("Helvetica");

  // Chief Guests — one large rounded green box, capable of 1-2 guests
  // side-by-side, with a pill title overlapping its top edge and a
  // "What's in it for you?" strip along the bottom, all per the reference.
  if (data.chiefGuests.length > 0) {
    const cardWidth = 150;
    const gap = 24;
    const guestsWidth = data.chiefGuests.length * cardWidth + (data.chiefGuests.length - 1) * gap;
    const photoSize = 92;

    // Every vertical offset below is derived, not guessed — a previous
    // fixed-guess boxHeight let the "What's in it for you?" strip overlap
    // the guest name card above it.
    const headerGap = 26;
    const backingHeight = photoSize + 18;
    const nameCardY = headerGap + 8 + photoSize + 4;
    const nameCardHeight = 62;
    const stripGap = 14;
    const stripHeight = 30;
    const bottomPad = 16;
    const boxHeight = nameCardY + nameCardHeight + stripGap + stripHeight + bottomPad;

    doc.roundedRect(PAGE_MARGIN, y, width, boxHeight, 16).fillColor(GREEN).fill();

    const guestBuffers = await Promise.all(data.chiefGuests.map((g) => fetchImageBuffer(g.photoUrl)));
    let cx = PAGE_MARGIN + (width - guestsWidth) / 2;
    data.chiefGuests.forEach((guest, i) => {
      const cardX = cx;
      doc.roundedRect(cardX, y + headerGap, cardWidth, backingHeight, 10).fillColor("#7fc98f").fill();
      drawPhoto(doc, guestBuffers[i], cardX + (cardWidth - photoSize) / 2, y + headerGap + 8, photoSize, guest.name, { borderColor: WHITE });
      doc.roundedRect(cardX, y + nameCardY, cardWidth, nameCardHeight, 8).fillColor(WHITE).fill();
      drawCaption(doc, guest.name, cardX + 6, y + nameCardY + 8, cardWidth - 12, { bold: true, size: 10, color: GREEN });
      if (guest.designation) drawCaption(doc, guest.designation, cardX + 6, y + nameCardY + 22, cardWidth - 12, { size: 8.5, color: MUTED });
      if (guest.company) drawCaption(doc, guest.company, cardX + 6, y + nameCardY + 38, cardWidth - 12, { bold: true, size: 8.5, color: INK });
      cx += cardWidth + gap;
    });

    drawPill(doc, "Chief Guests", PAGE_MARGIN + width / 2, y - 11, { width: 140 });

    const stripY = y + nameCardY + nameCardHeight + stripGap;
    const stripX = PAGE_MARGIN + 16;
    const stripWidth = width - 32;
    doc.roundedRect(stripX, stripY, stripWidth, stripHeight, 8).strokeColor("#c7e6d1").lineWidth(1).stroke();
    const badgeWidth = 150;
    doc.roundedRect(stripX + 4, stripY + 4, badgeWidth, stripHeight - 8, (stripHeight - 8) / 2).fillColor("#7fc98f").fill();
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9).text("What's in it for you?", stripX + 4, stripY + (stripHeight - 8) / 2, { width: badgeWidth, align: "center", height: 12 });
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(WHITE).text(data.whatsInItForYou, stripX + badgeWidth + 16, stripY + 6, { width: stripWidth - badgeWidth - 24, height: stripHeight - 10, ellipsis: true });
    doc.fillColor(INK).font("Helvetica");

    y += boxHeight + 22;
  }

  // Founder/Co-Founder + Director/President/Secretary/Treasurer — one
  // continuous full-bleed green band from here to the bottom of the page,
  // exactly as the reference cover does.
  // Fixed order (Founder, then Co-Founder), not query order — same
  // FOUNDING_ROLE_ORDER convention the chapter detail admin page uses.
  const foundingOrder = ["FOUNDER", "CO_FOUNDER"];
  const founders = foundingOrder.map((key) => data.leadership.find((l) => l.roleKey === key)).filter((l): l is RosterLeadershipRow => Boolean(l));
  const coreOrder = ["DIRECTOR", "PRESIDENT", "SECRETARY", "TREASURER"];
  const core = coreOrder.map((key) => data.leadership.find((l) => l.roleKey === key)).filter((l): l is RosterLeadershipRow => Boolean(l));

  if (founders.length > 0 || core.length > 0) {
    const bandHeight = doc.page.height - y;
    doc.rect(0, y, fullWidth, bandHeight).fillColor(GREEN_DARK).fill();
    let innerY = y + 20;

    if (founders.length > 0) {
      const panelHeight = 118;
      const panelWidth = Math.min(360, width - 40);
      const panelX = PAGE_MARGIN + (width - panelWidth) / 2;
      doc.roundedRect(panelX, innerY, panelWidth, panelHeight, 18).fillColor(GREEN_PALE).fill();

      const founderBuffers = await Promise.all(founders.map((f) => fetchImageBuffer(f.photoUrl)));
      const slot = panelWidth / founders.length;
      founders.forEach((f, i) => {
        const fx = panelX + i * slot + slot / 2 - 34;
        drawPhoto(doc, founderBuffers[i], fx, innerY + 12, 68, f.memberName, { borderColor: WHITE });
        drawCaption(doc, f.memberName, panelX + i * slot, innerY + 86, slot, { bold: true, size: 9.5, color: INK });
        drawCaption(doc, f.roleLabel, panelX + i * slot, innerY + 99, slot, { size: 8, color: MUTED });
      });
      innerY += panelHeight + 8;

      const chipWidth = 190;
      doc.roundedRect(PAGE_MARGIN + width / 2 - chipWidth / 2, innerY, chipWidth, 24, 12).fillColor(WHITE).fill();
      doc.fillColor(GREEN_DARK).font("Helvetica-Bold").fontSize(11).text(data.chapterName.toUpperCase(), PAGE_MARGIN + width / 2 - chipWidth / 2, innerY + 6, { width: chipWidth, align: "center" });
      doc.fillColor(INK).font("Helvetica");
      innerY += 24 + 18;
    }

    if (core.length > 0) {
      const slot = width / core.length;
      const coreBuffers = await Promise.all(core.map((entry) => fetchImageBuffer(entry.photoUrl)));
      core.forEach((entry, i) => {
        const cx = PAGE_MARGIN + i * slot;
        drawPhoto(doc, coreBuffers[i], cx + slot / 2 - 32, innerY, 64, entry.memberName, { borderColor: WHITE });
        drawCaption(doc, entry.memberName, cx, innerY + 70, slot, { bold: true, size: 9.5, color: WHITE });
        drawCaption(doc, entry.roleLabel, cx, innerY + 84, slot, { size: 8, color: GREEN_PALE });
      });
    }
  }
}

/** The three-column "Associates" grid — dynamically bucketed by RosterAssignment.group, since the same role can sit under a different column per chapter (see the schema comment on RosterAssociateGroup). */
async function renderCoordinators(doc: PDFKit.PDFDocument, data: RosterData) {
  doc.addPage();
  drawPatternBackground(doc);
  const width = doc.page.width - PAGE_MARGIN * 2;
  const top = PAGE_MARGIN + 20;
  const bottom = doc.page.height - PAGE_MARGIN;

  const columns: { group: RosterAssociateGroup; label: string }[] = [
    { group: "PRESIDENT", label: "President Associates" },
    { group: "SECRETARY", label: "Secretary Associates" },
    { group: "TREASURER", label: "Treasurer Associates" },
  ];
  const buckets = columns.map((c) => data.roleAssignments.filter((a) => a.group === c.group));
  const gap = 20;
  const colWidth = (width - gap * 2) / 3;
  const realMaxCount = Math.max(0, ...buckets.map((b) => b.length));
  const maxCount = Math.max(1, realMaxCount);
  const headerPad = 26;
  const bottomPad = 20;
  // No chapter has any coordinators assigned yet in practice — don't
  // stretch three empty panels to the full page height for that state;
  // a shorter placeholder card reads as "nothing here yet," not as a
  // layout bug once real assignments start filling it in.
  const panelHeight = realMaxCount === 0 ? 220 : bottom - top;
  const available = panelHeight - headerPad - bottomPad;

  // Size entries at a comfortably large, natural size first — bigger photo,
  // bigger captions — and only shrink below that if this many entries
  // genuinely can't fit one column. Previously the row height always
  // stretched to fill the *entire* page-height panel even with only 3-4
  // entries per column, spreading them out with large dead gaps between
  // people — this keeps entries naturally sized/spaced and simply leaves
  // any leftover panel height as a bottom margin instead.
  const naturalRowHeight = 118;
  const naturalPhotoSize = 70;
  const scale = Math.min(1, available / (maxCount * naturalRowHeight));
  const rowHeight = naturalRowHeight * scale;
  const photoSize = Math.max(32, naturalPhotoSize * scale);
  const nameSize = Math.max(8, 10.5 * scale);
  const roleSize = Math.max(7, 9 * scale);

  const allBuffers = await Promise.all(data.roleAssignments.map((a) => fetchImageBuffer(a.photoUrl)));
  const bufferByAssignment = new Map(data.roleAssignments.map((a, i) => [a, allBuffers[i]]));

  columns.forEach((column, colIndex) => {
    const x = PAGE_MARGIN + colIndex * (colWidth + gap);
    doc.roundedRect(x, top, colWidth, panelHeight, 18).fillColor(GREEN_PALE).fill();
    drawPill(doc, column.label, x + colWidth / 2, top - 11, { width: colWidth - 16 });

    const entries = buckets[colIndex];
    if (entries.length === 0) {
      doc.fontSize(10).fillColor(MUTED).text("No coordinators assigned yet.", x + 12, top + headerPad + 20, { width: colWidth - 24, align: "center" });
      return;
    }

    let entryY = top + headerPad;
    entries.forEach((entry) => {
      drawPhoto(doc, bufferByAssignment.get(entry) ?? null, x + colWidth / 2 - photoSize / 2, entryY, photoSize, entry.memberName, { borderColor: WHITE });
      drawCaption(doc, entry.memberName, x + 6, entryY + photoSize + 7, colWidth - 12, { bold: true, size: nameSize });
      drawCaption(doc, entry.roleLabel, x + 6, entryY + photoSize + 7 + nameSize + 4, colWidth - 12, { size: roleSize, color: GREEN_DARK });
      entryY += rowHeight;
    });
  });
}

/** Reuses the "measure real wrapped height, don't assume a fixed row height" lesson from the old member-export.ts PDF (backlog #16) — but here every row is deliberately the SAME fixed height (exactly 8/page, per the reference's own density), so long text is truncated with an ellipsis rather than wrapped, per the client's own correction: "do not allow a long address/email to push the row height unpredictably." */
async function renderMemberTable(doc: PDFKit.PDFDocument, data: RosterData, logoBuffer: Buffer | null) {
  const totalPages = Math.max(1, Math.ceil(data.members.length / MEMBERS_PER_PAGE));
  const width = doc.page.width - PAGE_MARGIN * 2;
  const cardX = PAGE_MARGIN - 10;
  const cardWidth = width + 20;

  const colSno = 34;
  const colPhoto = 78;
  const colDetails = (width - colSno - colPhoto) * 0.42;
  const colCategory = (width - colSno - colPhoto) * 0.2;
  const colGive = (width - colSno - colPhoto - colDetails - colCategory) / 2;
  const colAsk = colGive;

  const buffers = await Promise.all(data.members.map((m) => fetchImageBuffer(m.photoUrl)));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    doc.addPage();
    drawPatternBackground(doc);

    const cardTop = PAGE_MARGIN - 10;
    const cardBottom = doc.page.height - PAGE_MARGIN + 10;
    doc.roundedRect(cardX, cardTop, cardWidth, cardBottom - cardTop, 18).fillColor(WHITE).fill();

    let y = PAGE_MARGIN + 6;
    drawLogoBadge(doc, PAGE_MARGIN, y, logoBuffer);
    doc.font("Helvetica-Bold").fontSize(15).fillColor(INK).text(`ROSTER PAGE - ${pageIndex + 1}`, PAGE_MARGIN, y + 2, { width, align: "right" });
    y += 46;

    doc.rect(PAGE_MARGIN, y, width, 24).fillColor(GREEN).fill();
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(10.5);
    let hx = PAGE_MARGIN + 8;
    doc.text("S.no", hx, y + 7, { width: colSno });
    hx += colSno + colPhoto;
    doc.text("Member Details", hx, y + 7, { width: colDetails });
    hx += colDetails;
    doc.text("Category", hx, y + 7, { width: colCategory });
    hx += colCategory;
    doc.text("Give", hx, y + 7, { width: colGive });
    hx += colGive;
    doc.text("Ask", hx, y + 7, { width: colAsk });
    doc.fillColor(INK).font("Helvetica");
    y += 24;

    const tableBottom = cardBottom - 16;
    const rowHeight = (tableBottom - y) / MEMBERS_PER_PAGE;

    for (let slot = 0; slot < MEMBERS_PER_PAGE; slot += 1) {
      const memberIndex = pageIndex * MEMBERS_PER_PAGE + slot;
      const rowY = y + slot * rowHeight;

      doc.moveTo(PAGE_MARGIN, rowY).lineTo(PAGE_MARGIN + width, rowY).strokeColor(BORDER).lineWidth(0.5).stroke();

      const member = data.members[memberIndex];
      let cx = PAGE_MARGIN + 8;

      if (member) {
        doc.font("Helvetica-Bold").fontSize(13).text(String(memberIndex + 1).padStart(2, "0"), cx, rowY + rowHeight / 2 - 7, { width: colSno });
        cx += colSno;

        const photoSize = Math.min(colPhoto - 12, rowHeight - 14);
        drawPhoto(doc, buffers[memberIndex], cx, rowY + (rowHeight - photoSize) / 2, photoSize, member.name, { borderColor: BORDER });
        cx += colPhoto;

        const lineHeight = 15;
        let lineY = rowY + Math.max(6, (rowHeight - lineHeight * 4) / 2);
        doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(member.name, cx, lineY, { width: colDetails - 8, height: lineHeight, ellipsis: true });
        lineY += lineHeight;
        doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(member.company, cx, lineY, { width: colDetails - 8, height: lineHeight, ellipsis: true });
        lineY += lineHeight;
        if (member.address) {
          doc.text(member.address, cx, lineY, { width: colDetails - 8, height: lineHeight, ellipsis: true });
        }
        lineY += lineHeight;
        const contactLine = [member.phone, member.email].filter(Boolean).join("   ·   ");
        if (contactLine) doc.text(contactLine, cx, lineY, { width: colDetails - 8, height: lineHeight, ellipsis: true });
        doc.fillColor(INK);
        cx += colDetails;

        doc.font("Helvetica").fontSize(10.5).text(member.category, cx, rowY + (rowHeight - 14) / 2, { width: colCategory - 8, height: 28, ellipsis: true });
      }

      cx = PAGE_MARGIN + colSno + colPhoto + colDetails + colCategory + 8;
      doc.rect(cx, rowY, colGive, rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();
      cx += colGive;
      doc.rect(cx, rowY, colAsk, rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();
    }

    doc.moveTo(PAGE_MARGIN, tableBottom).lineTo(PAGE_MARGIN + width, tableBottom).strokeColor(BORDER).lineWidth(0.5).stroke();
  }
}

/**
 * One consolidated, fully green-branded final page: an optional overall
 * Notes box, Guest Self-Introduction, Open Categories, and the BWF Pledge +
 * feedback QR — the client's own correction was explicit that splitting
 * this across several pages (as the prior version did) isn't the reference
 * design. Open Categories shrinks its own font to keep everything on this
 * one page rather than spilling onto a continuation, since the reference
 * never paginates this page either — and since the Notes box (when
 * present) pushes everything else down, the same shrink-as-needed budget
 * automatically accounts for it too.
 */
function renderFinalPage(doc: PDFKit.PDFDocument, data: RosterData, visitorFeedbackQr: Buffer | null) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  const pageBottom = doc.page.height - PAGE_MARGIN;
  doc.rect(0, 0, doc.page.width, doc.page.height).fillColor(GREEN).fill();

  let y = PAGE_MARGIN;

  // --- Pledge dimensions computed up-front (2026-09-16 correction) —
  // content-driven, independent of category count or page position, so
  // Open Categories' available-space budget below is accurate and the
  // Pledge box itself (drawn later) can be sized tightly to its own
  // content instead of stretching to fill whatever's left, which is
  // exactly the "lots of negative space" the client flagged.
  const pledgeFontSize = 10;
  const pledgeQrSize = 100;
  const pledgeVerticalPad = 20;
  const pledgeTextWidth = visitorFeedbackQr ? width - pledgeQrSize - 60 : width - 32;
  // Explicit font family, not just size: measuring in whatever family
  // happened to carry over from the previous page (Helvetica) while later
  // rendering in Helvetica-Bold (left over from the Pledge heading draw)
  // is exactly the bug that silently clipped pledge lines mid-sentence —
  // bold glyphs are wider, so the actually-rendered text needed more
  // lines than the regular-weight measurement predicted.
  doc.font("Helvetica").fontSize(pledgeFontSize);
  const pledgeLineHeights = PLEDGE_LINES.map((line) => doc.heightOfString(line, { width: pledgeTextWidth - 14 }));
  const pledgeTextHeight = pledgeLineHeights.reduce((sum, h) => sum + h + 10, -10);
  const pledgeContentHeight = Math.max(pledgeTextHeight, visitorFeedbackQr ? pledgeQrSize : 0);
  const pledgeBoxHeight = pledgeContentHeight + pledgeVerticalPad * 2;

  // --- Guest Self-Introduction Format ---
  // Wording/heading now come from static-content.ts (the single source
  // shared with the on-page wizard preview) — introHeight grew by 16pt to
  // fit the "Dear Guest," salutation line, which every reference PDF has
  // but an earlier pass here had silently dropped.
  const introHeight = 124;
  doc.roundedRect(PAGE_MARGIN, y, width, introHeight, 12).strokeColor(WHITE).lineWidth(1.5).stroke();
  const tabWidth = Math.min(320, width - 40);
  doc.roundedRect(PAGE_MARGIN + (width - tabWidth) / 2, y - 12, tabWidth, 26, 13).fillColor(WHITE).fill();
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text(GUEST_SELF_INTRODUCTION_HEADING, PAGE_MARGIN + (width - tabWidth) / 2, y - 5, { width: tabWidth, align: "center" });

  // Every line below gets an explicit `height` — an unbounded multi-line
  // .text() call, even at absolute x/y, makes pdfkit treat it as flowing
  // content and it will silently insert a trailing extra page once it
  // thinks the block might overflow the current one.
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(9);
  doc.text(GUEST_SELF_INTRODUCTION_SALUTATION, PAGE_MARGIN + 16, y + 14, { width: width - 32, height: 12 });
  doc.font("Helvetica");
  doc.text(GUEST_SELF_INTRODUCTION_INSTRUCTIONS, PAGE_MARGIN + 16, y + 30, { width: width - 32, height: 22 });
  doc.text(GUEST_SELF_INTRODUCTION_LINES[0], PAGE_MARGIN + 16, y + 60, { width: width - 32, height: 14 });
  doc.text(GUEST_SELF_INTRODUCTION_LINES[1], PAGE_MARGIN + 16, y + 80, { width: width - 32, height: 14 });
  doc.text(GUEST_SELF_INTRODUCTION_LINES[2], PAGE_MARGIN + 16, y + 100, { width: width - 32, height: 14 });
  doc.fillColor(INK).font("Helvetica");
  y += introHeight + 26;

  // --- Open Categories ---
  // Sized to its own CONTENT first, at a generous baseline font, instead of
  // always stretching to fill whatever space was reserved — the old fixed
  // 190pt reservation for the Pledge block left a mostly-empty white panel
  // with small type whenever a chapter had only a handful of open
  // categories. The cap below reserves the Pledge box's real, content-
  // driven height (computed above) AND a minimum for the Notes box below
  // it (2026-09-16 correction) — a real bug caught only by testing with a
  // real, long category list: without reserving Notes' own minimum here, a
  // long list could push Pledge+Notes past the page bottom and trigger
  // pdfkit's silent trailing-blank-page behavior. Whatever the panel
  // doesn't need beyond its own natural height flows through to make Notes
  // bigger than its minimum, not to Pledge (which is now fixed-height).
  const panelTop = y;
  const colGap = 16;
  const topPad = 22;
  const bottomPad = 14;
  const gapAfterPanel = 26;
  const pledgeHeadingHeight = 22;
  const bottomFooterPad = 26;
  const notesGap = 24;
  const minNotesHeight = 90;
  const notesReserve = data.notesEnabled ? notesGap + minNotesHeight : 0;
  const maxPanelHeight = pageBottom - panelTop - gapAfterPanel - pledgeHeadingHeight - pledgeBoxHeight - notesReserve - bottomFooterPad;

  let panelHeight: number;
  let catCols = 3;
  let catFontSize = 11;
  let catRowsPerCol = Math.ceil(Math.max(1, data.openCategoryNames.length) / catCols);
  let catLineHeight = catFontSize + 7;

  if (data.openCategoryNames.length === 0) {
    panelHeight = Math.max(90, Math.min(140, maxPanelHeight));
  } else {
    const naturalHeight = topPad + catRowsPerCol * catLineHeight + bottomPad;
    if (naturalHeight <= maxPanelHeight) {
      panelHeight = naturalHeight;
    } else {
      // Doesn't fit at the generous baseline (a large, undeduplicated
      // category list) — try more columns, then shrink font, down to a
      // legible floor, clipped to the panel regardless as a last resort so
      // it can never bleed into the Pledge box below.
      const innerHeight = maxPanelHeight - topPad - bottomPad;
      for (catCols = 3; catCols <= 6; catCols += 1) {
        catFontSize = 11;
        catRowsPerCol = Math.ceil(data.openCategoryNames.length / catCols);
        catLineHeight = catFontSize + 7;
        while (catRowsPerCol * catLineHeight > innerHeight && catFontSize > 6.5) {
          catFontSize -= 0.5;
          catLineHeight = catFontSize + 5;
        }
        if (catRowsPerCol * catLineHeight <= innerHeight) break;
      }
      panelHeight = maxPanelHeight;
    }
  }

  doc.roundedRect(PAGE_MARGIN, panelTop, width, panelHeight, 12).fillColor(WHITE).fill();
  drawPill(doc, "OPEN CATEGORIES", PAGE_MARGIN + width / 2, panelTop - 11, { width: 200 });

  if (data.openCategoryNames.length === 0) {
    doc.fontSize(10.5).fillColor(MUTED).text("Every active category is currently occupied in this chapter.", PAGE_MARGIN + 16, panelTop + panelHeight / 2 - 6, { width: width - 32, align: "center" });
  } else {
    const innerTop = panelTop + topPad;
    const colWidth = (width - 32 - colGap * (catCols - 1)) / catCols;

    doc.save();
    doc.rect(PAGE_MARGIN, panelTop, width, panelHeight).clip();
    doc.font("Helvetica").fontSize(catFontSize).fillColor(INK);
    data.openCategoryNames.forEach((name, i) => {
      const col = Math.floor(i / catRowsPerCol);
      const row = i % catRowsPerCol;
      const bx = PAGE_MARGIN + 16 + col * (colWidth + colGap);
      const by = innerTop + row * catLineHeight;
      doc.rect(bx, by + catFontSize * 0.3, 5, 5).fillColor(GREEN).fill();
      doc.fillColor(INK).text(name, bx + 11, by, { width: colWidth - 11, height: catLineHeight, ellipsis: true });
    });
    doc.restore();
    doc.fillColor(INK).font("Helvetica");
  }
  y = panelTop + panelHeight + gapAfterPanel;

  // --- Pledge + Visitor Feedback QR ---
  // Box height is the content-driven `pledgeBoxHeight` computed up-front,
  // not stretched to fill remaining page space (2026-09-16 correction —
  // the stretch was exactly the "lots of negative space" the client
  // flagged from a real rendered page).
  doc.font("Helvetica-Bold").fontSize(13).fillColor(WHITE).text(PLEDGE_HEADING, PAGE_MARGIN, y, { width, align: "center" });
  y += pledgeHeadingHeight;

  doc.roundedRect(PAGE_MARGIN, y, width, pledgeBoxHeight, 12).strokeColor(WHITE).lineWidth(1.5).stroke();

  doc.font("Helvetica").fontSize(pledgeFontSize).fillColor(WHITE);
  let cy = y + Math.max(pledgeVerticalPad, (pledgeBoxHeight - pledgeTextHeight) / 2);
  PLEDGE_LINES.forEach((line, i) => {
    const lineHeight = pledgeLineHeights[i];
    doc.rect(PAGE_MARGIN + 16, cy + 2, 3, lineHeight - 2).fillColor("#cfe86b").fill();
    // Explicit `height` is load-bearing, not decorative: without it pdfkit's
    // text flow treats an unbounded multi-line block as flowing content and
    // silently inserts an extra trailing page once it thinks the block
    // might overflow — even though x/y are absolute here. Bounding it to
    // its own measured height keeps this page at exactly one page.
    doc.fillColor(WHITE).text(line, PAGE_MARGIN + 28, cy, { width: pledgeTextWidth - 14, height: lineHeight });
    cy += lineHeight + 7;
  });

  if (visitorFeedbackQr) {
    const qrX = PAGE_MARGIN + width - pledgeQrSize - 24;
    const qrY = y + (pledgeBoxHeight - pledgeQrSize) / 2;
    try {
      doc.roundedRect(qrX - 8, qrY - 8, pledgeQrSize + 16, pledgeQrSize + 30, 8).fillColor(WHITE).fill();
      doc.image(visitorFeedbackQr, qrX, qrY, { width: pledgeQrSize, height: pledgeQrSize });
      doc.fontSize(7.5).fillColor(GREEN).font("Helvetica-Bold").text("Visitor Feedback", qrX - 8, qrY + pledgeQrSize + 4, { width: pledgeQrSize + 16, align: "center" });
      doc.fillColor(INK).font("Helvetica");
    } catch {
      // Skip silently — a broken QR image must never crash the PDF.
    }
  }

  y += pledgeBoxHeight;

  // --- Notes (2026-09-16 correction) — one overall notes box for the
  // whole roster, printed BELOW the Pledge (the client's own explicit
  // placement, moved here after seeing the first rendered page — not
  // above the Self-Introduction block like an earlier pass had it). Fills
  // whatever real space is left down to the footer, since the Pledge box
  // above no longer soaks it up — "there will still be extra page left,"
  // per the client, so make the box bigger, not fixed-small.
  if (data.notesEnabled) {
    const notesTop = y + notesGap;
    // Reuses the same minNotesHeight the Open Categories budget above
    // already reserved — this can only be >= that floor, never less, so
    // the page can never overflow regardless of category count.
    const notesHeight = Math.max(minNotesHeight, pageBottom - notesTop - bottomFooterPad);
    doc.roundedRect(PAGE_MARGIN, notesTop, width, notesHeight, 12).strokeColor(WHITE).lineWidth(1.5).stroke();
    const notesTabWidth = 100;
    doc.roundedRect(PAGE_MARGIN + (width - notesTabWidth) / 2, notesTop - 12, notesTabWidth, 26, 13).fillColor(WHITE).fill();
    doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(11).text("Notes", PAGE_MARGIN + (width - notesTabWidth) / 2, notesTop - 5, { width: notesTabWidth, align: "center" });
    doc.fillColor(INK).font("Helvetica");
  }

  // `height` here isn't cosmetic: this sits right at the bottom margin, and
  // without an explicit bound pdfkit's flowing-text logic treats it as
  // possibly overflowing the page and silently appends a blank trailing
  // page — the exact bug that showed up as a 12th, empty page.
  doc.fillColor(WHITE).font("Helvetica").fontSize(9).text("www.buildersworldforum.com", PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 14, { width, align: "center", height: 12 });
  doc.fillColor(INK);
}

export async function generateRosterPdf(data: RosterData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const visitorFeedbackQr = await fetchImageBuffer(data.visitorFeedbackQrUrl);
  const logoBuffer = await fetchImageBuffer("/images/brand/bwf-logo-512.png");

  await renderCover(doc, data, logoBuffer);
  await renderCoordinators(doc, data);
  await renderMemberTable(doc, data, logoBuffer);
  renderFinalPage(doc, data, visitorFeedbackQr);

  doc.end();
  return done;
}
