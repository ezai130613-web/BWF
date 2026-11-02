import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
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

/**
 * Member/coordinator/guest photos are re-encoded through sharp before
 * pdfkit sees them. pdfkit embeds a JPEG's bytes as-is, so a truncated or
 * oddly-encoded upload "succeeds" and then renders in the printed PDF as a
 * grey box with a sliver of photo at the top (seen on a real Chapter 04
 * roster). sharp fully decodes first — a corrupt file throws here and the
 * row falls back to initials instead — and also applies EXIF rotation and
 * shrinks phone-camera originals to print size.
 */
async function fetchPhotoBuffer(url: string | null | undefined): Promise<Buffer | null> {
  const raw = await fetchImageBuffer(url);
  if (!raw) return null;
  try {
    return await sharp(raw).rotate().resize(400, 400, { fit: "cover", withoutEnlargement: true }).flatten({ background: WHITE }).jpeg({ quality: 85 }).toBuffer();
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

/** Returns whether the Associates panels were placed on the cover (in which case they get no page of their own). */
async function renderCover(doc: PDFKit.PDFDocument, data: RosterData, logoBuffer: Buffer | null, associateBuffers: (Buffer | null)[]): Promise<boolean> {
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

    const guestBuffers = await Promise.all(data.chiefGuests.map((g) => fetchPhotoBuffer(g.photoUrl)));
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

  // Gap control (2026-11-02 client feedback, "too much gap" on a real
  // Chapter 04 cover): heights of the leadership blocks are known up-front,
  // so the Associates panels are pulled up into whatever's left of the band
  // when they fit at a legible size, instead of leaving most of page 1 empty
  // green. When they don't fit, the leadership is centred in the band
  // rather than stacked at the top.
  const foundersBlockHeight = founders.length > 0 ? 118 + 8 + 24 + 18 : 0;
  const coreBlockHeight = core.length > 0 ? 100 : 0;
  const bandPad = 20;
  const leadershipHeight = foundersBlockHeight + coreBlockHeight;
  const associatesTop = y + bandPad + leadershipHeight + (leadershipHeight > 0 ? 24 : 12);
  const associatesBottom = doc.page.height - PAGE_MARGIN + 10;
  const placeAssociates = associatesLayout(data, associatesTop, associatesBottom, true).fits;

  if (placeAssociates || founders.length > 0 || core.length > 0) {
    const bandHeight = doc.page.height - y;
    doc.rect(0, y, fullWidth, bandHeight).fillColor(GREEN_DARK).fill();
    let innerY = placeAssociates ? y + bandPad : y + Math.max(bandPad, (bandHeight - leadershipHeight) / 2);

    if (founders.length > 0) {
      const panelHeight = 118;
      const panelWidth = Math.min(360, width - 40);
      const panelX = PAGE_MARGIN + (width - panelWidth) / 2;
      doc.roundedRect(panelX, innerY, panelWidth, panelHeight, 18).fillColor(GREEN_PALE).fill();

      const founderBuffers = await Promise.all(founders.map((f) => fetchPhotoBuffer(f.photoUrl)));
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
      const coreBuffers = await Promise.all(core.map((entry) => fetchPhotoBuffer(entry.photoUrl)));
      core.forEach((entry, i) => {
        const cx = PAGE_MARGIN + i * slot;
        drawPhoto(doc, coreBuffers[i], cx + slot / 2 - 32, innerY, 64, entry.memberName, { borderColor: WHITE });
        drawCaption(doc, entry.memberName, cx, innerY + 70, slot, { bold: true, size: 9.5, color: WHITE });
        drawCaption(doc, entry.roleLabel, cx, innerY + 84, slot, { size: 8, color: GREEN_PALE });
      });
    }
  }

  if (placeAssociates) drawAssociates(doc, data, associateBuffers, associatesTop, associatesBottom, true);
  return placeAssociates;
}

const ASSOCIATE_COLUMNS: { group: RosterAssociateGroup; label: string }[] = [
  { group: "PRESIDENT", label: "President Associates" },
  { group: "SECRETARY", label: "Secretary Associates" },
  { group: "TREASURER", label: "Treasurer Associates" },
];

/**
 * Sizes the Associates panels for the space between `top` and `maxBottom`.
 * Entries sit at a comfortably large, natural size first and only shrink
 * (`scale` < 1) if a column genuinely can't fit; the panels are then cut to
 * their content height rather than stretched to `maxBottom`, so a short
 * column never leaves a tall, mostly-empty panel.
 */
function associatesLayout(data: RosterData, top: number, maxBottom: number, allowCompact = false) {
  const buckets = ASSOCIATE_COLUMNS.map((c) => data.roleAssignments.filter((a) => a.group === c.group));
  const realMaxCount = Math.max(0, ...buckets.map((b) => b.length));
  const headerPad = 26;
  const bottomPad = 16;
  const naturalRowHeight = 112;
  const compactRowHeight = 50;
  // No coordinators at all — a short placeholder card, not three tall empty panels.
  if (realMaxCount === 0) return { buckets, headerPad, compact: false, fits: maxBottom - top >= 90, scale: 1, rowHeight: 0, panelHeight: 90 };
  const available = maxBottom - top - headerPad - bottomPad;
  const scale = Math.min(1, available / (realMaxCount * naturalRowHeight));
  // Stacked photo-over-caption entries while they stay legible; on the
  // cover, below that, a compact row (photo left, name/role right) — less
  // than half the height per person, so a full column still fits under the
  // leadership instead of spilling onto a page of its own.
  if (scale >= 0.6 || !allowCompact) {
    const rowHeight = naturalRowHeight * scale;
    return { buckets, headerPad, compact: false, fits: scale >= 0.6, scale, rowHeight, panelHeight: headerPad + realMaxCount * rowHeight + bottomPad };
  }
  const fits = realMaxCount * compactRowHeight <= available;
  return { buckets, headerPad, compact: true, fits, scale: 1, rowHeight: compactRowHeight, panelHeight: headerPad + realMaxCount * compactRowHeight + bottomPad };
}

/** The three-column "Associates" grid — dynamically bucketed by RosterAssignment.group, since the same role can sit under a different column per chapter (see the schema comment on RosterAssociateGroup). */
function drawAssociates(doc: PDFKit.PDFDocument, data: RosterData, buffers: (Buffer | null)[], top: number, maxBottom: number, allowCompact = false) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const gap = 20;
  const colWidth = (width - gap * 2) / 3;
  const { buckets, headerPad, compact, scale, rowHeight, panelHeight } = associatesLayout(data, top, maxBottom, allowCompact);
  const photoSize = Math.max(32, 70 * scale);
  const nameSize = Math.max(8, 10.5 * scale);
  const roleSize = Math.max(7, 9 * scale);
  const bufferByAssignment = new Map(data.roleAssignments.map((a, i) => [a, buffers[i]]));
  const columns = ASSOCIATE_COLUMNS;

  columns.forEach((column, colIndex) => {
    const x = PAGE_MARGIN + colIndex * (colWidth + gap);
    doc.roundedRect(x, top, colWidth, panelHeight, 18).fillColor(GREEN_PALE).fill();
    drawPill(doc, column.label, x + colWidth / 2, top - 11, { width: colWidth - 16 });

    const entries = buckets[colIndex];
    if (entries.length === 0) {
      doc.fontSize(10).fillColor(MUTED).text("No coordinators assigned yet.", x + 12, top + headerPad + 8, { width: colWidth - 24, align: "center" });
      return;
    }

    let entryY = top + headerPad;
    entries.forEach((entry) => {
      if (compact) {
        const size = 40;
        const textX = x + 12 + size + 10;
        drawPhoto(doc, bufferByAssignment.get(entry) ?? null, x + 12, entryY, size, entry.memberName, { borderColor: WHITE });
        drawCaption(doc, entry.memberName, textX, entryY + 9, x + colWidth - 8 - textX, { bold: true, size: 9.5, align: "left" });
        drawCaption(doc, entry.roleLabel, textX, entryY + 23, x + colWidth - 8 - textX, { size: 8, color: GREEN_DARK, align: "left" });
        entryY += rowHeight;
        return;
      }
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
  // Wider than Give/Ask's even split so multi-word categories ("Bricks (Red,
  // Fly Ash, …)") wrap inside the cell instead of being ellipsized.
  const colCategory = (width - colSno - colPhoto) * 0.24;
  const colGive = (width - colSno - colPhoto - colDetails - colCategory) / 2;
  const colAsk = colGive;

  const buffers = await Promise.all(data.members.map((m) => fetchPhotoBuffer(m.photoUrl)));

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
    // Give/Ask boxes start exactly at their column edge (see the row loop),
    // so their labels are inset by the same 8pt padding as the other cells.
    doc.text("Give", hx + 8, y + 7, { width: colGive - 8 });
    hx += colGive;
    doc.text("Ask", hx + 8, y + 7, { width: colAsk - 8 });
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

        // Phone and email each get their own line — sharing one line meant
        // every member with both printed "98xxxxxxxx ·…" and lost the email.
        const nameLineHeight = 15;
        const lineHeight = 13;
        const detailLines = [member.company, member.address, member.phone, member.email].filter((l): l is string => Boolean(l));
        let lineY = rowY + Math.max(6, (rowHeight - nameLineHeight - lineHeight * detailLines.length) / 2);
        doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(member.name, cx, lineY, { width: colDetails - 8, height: nameLineHeight, ellipsis: true });
        lineY += nameLineHeight;
        doc.font("Helvetica").fontSize(9.5).fillColor(MUTED);
        detailLines.forEach((line) => {
          doc.text(line, cx, lineY, { width: colDetails - 8, height: lineHeight, ellipsis: true });
          lineY += lineHeight;
        });
        doc.fillColor(INK);
        cx += colDetails;

        // Wraps to as many lines as the fixed row allows, vertically centred.
        doc.font("Helvetica").fontSize(10);
        const categoryMaxHeight = rowHeight - 12;
        const categoryHeight = Math.min(categoryMaxHeight, doc.heightOfString(member.category, { width: colCategory - 8 }));
        doc.text(member.category, cx, rowY + (rowHeight - categoryHeight) / 2, { width: colCategory - 8, height: categoryMaxHeight, ellipsis: true });
      }

      cx = PAGE_MARGIN + colSno + colPhoto + colDetails + colCategory;
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

  // Two layouts, chosen by what fits WITHOUT truncating any name — an
  // ellipsized grid made several entries indistinguishable on a real
  // roster ("Electrical…" ×3, "Construction…" ×2), which defeats the point
  // of telling guests which categories are open:
  //   1. the reference's bulleted grid, when some column count/font size
  //      fits every name on one line;
  //   2. otherwise one flowing "A • B • C" paragraph at the largest font
  //      that fits, packed line-by-line here so a name is never split
  //      across lines (pdfkit's own wrapping breaks at hyphens, e.g.
  //      "Civil Contractor -" / "2").
  // Only if even the flowing layout can't fit at the 6.5pt floor is it
  // clipped to the panel, so it can never bleed into the Pledge box below.
  const catInnerWidth = width - 32;
  const maxInnerHeight = maxPanelHeight - topPad - bottomPad;
  const flowSeparator = "   •   ";
  const packFlowLines = () => {
    const lines: string[] = [];
    let current = "";
    for (const name of data.openCategoryNames) {
      const candidate = current ? current + flowSeparator + name : name;
      if (current && doc.widthOfString(candidate) > catInnerWidth) {
        lines.push(current + flowSeparator.trimEnd());
        current = name;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  let grid: { cols: number; rowsPerCol: number; fontSize: number; lineHeight: number } | null = null;
  let flowFontSize = 11;
  let flowLines: string[] = [];
  let flowLineHeight = 0;
  let contentHeight = 0;

  if (data.openCategoryNames.length > 0) {
    doc.font("Helvetica");
    // The grid stops at 9pt: below that the flowing layout fits far more
    // per line and stays at a larger, more legible size.
    search: for (let fontSize = 11; fontSize >= 9; fontSize -= 0.5) {
      doc.fontSize(fontSize);
      const longest = Math.max(...data.openCategoryNames.map((n) => doc.widthOfString(n)));
      const lineHeight = fontSize + (fontSize >= 10 ? 7 : 5);
      for (let cols = 2; cols <= 6; cols += 1) {
        const colWidth = (catInnerWidth - colGap * (cols - 1)) / cols;
        if (longest > colWidth - 11) break;
        const rowsPerCol = Math.ceil(data.openCategoryNames.length / cols);
        if (rowsPerCol * lineHeight <= maxInnerHeight) {
          grid = { cols, rowsPerCol, fontSize, lineHeight };
          contentHeight = rowsPerCol * lineHeight;
          break search;
        }
      }
    }
    if (!grid) {
      for (flowFontSize = 11; ; flowFontSize -= 0.5) {
        doc.fontSize(flowFontSize);
        flowLines = packFlowLines();
        flowLineHeight = flowFontSize + 4;
        if (flowLines.length * flowLineHeight <= maxInnerHeight || flowFontSize <= 6.5) break;
      }
      contentHeight = Math.min(maxInnerHeight, flowLines.length * flowLineHeight);
    }
  }

  const panelHeight = data.openCategoryNames.length === 0 ? Math.max(90, Math.min(140, maxPanelHeight)) : topPad + contentHeight + bottomPad;

  doc.roundedRect(PAGE_MARGIN, panelTop, width, panelHeight, 12).fillColor(WHITE).fill();
  drawPill(doc, "OPEN CATEGORIES", PAGE_MARGIN + width / 2, panelTop - 11, { width: 200 });

  if (data.openCategoryNames.length === 0) {
    doc.fontSize(10.5).fillColor(MUTED).text("Every active category is currently occupied in this chapter.", PAGE_MARGIN + 16, panelTop + panelHeight / 2 - 6, { width: width - 32, align: "center" });
  } else {
    const innerTop = panelTop + topPad;

    doc.save();
    doc.rect(PAGE_MARGIN, panelTop, width, panelHeight).clip();
    if (grid) {
      const { cols, rowsPerCol, fontSize, lineHeight } = grid;
      const colWidth = (catInnerWidth - colGap * (cols - 1)) / cols;
      doc.font("Helvetica").fontSize(fontSize).fillColor(INK);
      data.openCategoryNames.forEach((name, i) => {
        const col = Math.floor(i / rowsPerCol);
        const row = i % rowsPerCol;
        const bx = PAGE_MARGIN + 16 + col * (colWidth + colGap);
        const by = innerTop + row * lineHeight;
        doc.rect(bx, by + fontSize * 0.3, 5, 5).fillColor(GREEN).fill();
        doc.fillColor(INK).text(name, bx + 11, by, { width: colWidth - 11, height: lineHeight });
      });
    } else {
      doc.font("Helvetica").fontSize(flowFontSize).fillColor(INK);
      flowLines.forEach((line, i) => {
        doc.text(line, PAGE_MARGIN + 16, innerTop + i * flowLineHeight, { width: catInnerWidth, height: flowLineHeight, lineBreak: false });
      });
    }
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

  const associateBuffers = await Promise.all(data.roleAssignments.map((a) => fetchPhotoBuffer(a.photoUrl)));
  const associatesOnCover = await renderCover(doc, data, logoBuffer, associateBuffers);
  if (!associatesOnCover) {
    doc.addPage();
    drawPatternBackground(doc);
    drawAssociates(doc, data, associateBuffers, PAGE_MARGIN + 20, doc.page.height - PAGE_MARGIN);
  }
  await renderMemberTable(doc, data, logoBuffer);
  renderFinalPage(doc, data, visitorFeedbackQr);

  doc.end();
  return done;
}
