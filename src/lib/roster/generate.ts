import { readFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";

/**
 * Phase 20 Batch 3 — Roster Sheet PDF generator. Layout follows the 3 real
 * reference roster PDFs (docs/reference/roster-sheets/) collapsed into one
 * consistent template (per the client's "one template, not each chapter's
 * own historical layout" decision) across 5 sections: cover, coordinators,
 * member table, final page (self-intro/open categories/pledge), and an
 * invitation flyer (previously only Chapter 3's reference had one — now on
 * every roster).
 *
 * Deliberately not a pixel-perfect recreation of the reference PDFs'
 * graphic design (rounded gradient panels, drop shadows) — pdfkit is a
 * low-level drawing API, and reproducing that exactly would be a large,
 * separate design effort disproportionate to what a printable operational
 * handout needs. This renders the same structure/content cleanly instead.
 */

const GREEN = "#146c3a";
const GREEN_LIGHT = "#eef7f0";
const INK = "#1a1a1a";
const MUTED = "#666666";
const BORDER = "#d9d9d9";

const PAGE_MARGIN = 40;

export type RosterMemberRow = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  photoUrl: string | null;
  company: string;
  category: string;
};

export type RosterAssignmentRow = {
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
  meetingTitle: string;
  meetingStartsAt: Date;
  meetingVenue: string | null;
  meetingAddress: string | null;
  registrationFeeText: string;
  leadership: RosterLeadershipRow[];
  roleAssignments: RosterAssignmentRow[];
  members: RosterMemberRow[];
  chiefGuests: RosterChiefGuestRow[];
  openCategoryNames: string[];
  visitorFeedbackQrUrl: string | null;
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

/** Draws a circular photo at (x,y) with the given diameter, falling back to an initials placeholder when `buffer` is null. */
function drawPhoto(doc: PDFKit.PDFDocument, buffer: Buffer | null, x: number, y: number, size: number, name: string) {
  const cx = x + size / 2;
  const cy = y + size / 2;

  doc.save();
  doc.circle(cx, cy, size / 2).clip();
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
      .fontSize(size / 2.4)
      .text(initialsFor(name), x, y + size / 2 - size / 5, { width: size, align: "center" });
  }

  doc.circle(cx, cy, size / 2).lineWidth(1).strokeColor(BORDER).stroke();
  doc.fillColor(INK);
}

/**
 * One-line, center-aligned caption under a photo — forces truncation
 * (`height` + `ellipsis`) instead of letting a long name wrap onto a
 * second line and collide with the caption below it, the same overlap bug
 * the old member-export.ts PDF hit with fixed-height rows (backlog #16).
 */
function drawCaption(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  const size = opts.size ?? 9;
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(opts.color ?? INK);
  doc.text(text, x, y, { width, align: "center", height: size + 2, ellipsis: true });
  doc.fillColor(INK).font("Helvetica");
}

function drawLogoBadge(doc: PDFKit.PDFDocument, x: number, y: number) {
  doc
    .fontSize(9)
    .fillColor(GREEN)
    .font("Helvetica-Bold")
    .text("BUILDERS WORLD FORUM", x, y, { characterSpacing: 0.4 });
  doc.fontSize(7).fillColor(MUTED).font("Helvetica-Oblique").text("Exclusive Forum for Construction Industry", x, y + 12);
  doc.font("Helvetica").fillColor(INK);
}

function sectionHeading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number) {
  doc.rect(x, y, width, 22).fillColor(GREEN).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text(text, x + 10, y + 6);
  doc.fillColor(INK).font("Helvetica");
  return y + 22;
}

async function renderCover(doc: PDFKit.PDFDocument, data: RosterData) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  // Date / Name fill-in header, exactly as printed on the reference sheets — hand-filled at the meeting, not pre-populated.
  doc.rect(PAGE_MARGIN, y, width, 26).fillColor(GREEN).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10);
  doc.text("Date:", PAGE_MARGIN + 10, y + 8);
  doc.rect(PAGE_MARGIN + 45, y + 5, 140, 16).fillColor("#ffffff").fill();
  doc.fillColor("#ffffff").text("Name:", PAGE_MARGIN + 210, y + 8);
  doc.rect(PAGE_MARGIN + 250, y + 5, width - 260, 16).fillColor("#ffffff").fill();
  doc.fillColor(INK).font("Helvetica");
  y += 40;

  drawLogoBadge(doc, PAGE_MARGIN, y);
  doc
    .roundedRect(doc.page.width - PAGE_MARGIN - 70, y, 70, 20, 10)
    .fillColor(GREEN)
    .fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("ROSTER", doc.page.width - PAGE_MARGIN - 70, y + 6, { width: 70, align: "center" });
  doc.fillColor(INK).font("Helvetica");
  y += 40;

  doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(`${data.chapterName.toUpperCase()} MEETING`, PAGE_MARGIN, y);
  y += 18;
  doc.font("Helvetica-Bold").fontSize(15);
  const taglineHeight = doc.heightOfString("NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS", { width });
  doc.text("NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS", PAGE_MARGIN, y, { width });
  y += taglineHeight + 14;
  doc.font("Helvetica");

  if (data.chiefGuests.length > 0) {
    y = sectionHeading(doc, "Chief Guests", PAGE_MARGIN, y, width);
    y += 10;
    const cardWidth = Math.min(150, (width - 20) / data.chiefGuests.length);
    let cx = PAGE_MARGIN;
    const guestBuffers = await Promise.all(data.chiefGuests.map((g) => fetchImageBuffer(g.photoUrl)));
    data.chiefGuests.forEach((guest, i) => {
      drawPhoto(doc, guestBuffers[i], cx + cardWidth / 2 - 30, y, 60, guest.name);
      drawCaption(doc, guest.name, cx, y + 66, cardWidth, { bold: true, size: 9 });
      if (guest.designation) drawCaption(doc, guest.designation, cx, y + 78, cardWidth, { size: 8, color: MUTED });
      if (guest.company) drawCaption(doc, guest.company, cx, y + 90, cardWidth, { bold: true, size: 8 });
      cx += cardWidth + 10;
    });
    y += 110;
  }

  // Founder / Co-Founder band.
  const founders = data.leadership.filter((l) => l.roleKey === "FOUNDER" || l.roleKey === "CO_FOUNDER");
  if (founders.length > 0) {
    doc.rect(PAGE_MARGIN, y, width, 60 + 24).fillColor(GREEN_LIGHT).fill();
    const founderBuffers = await Promise.all(founders.map((f) => fetchImageBuffer(f.photoUrl)));
    let fx = PAGE_MARGIN + 20;
    founders.forEach((f, i) => {
      drawPhoto(doc, founderBuffers[i], fx, y + 8, 48, f.memberName);
      drawCaption(doc, f.memberName, fx - 15, y + 60, 78, { bold: true, size: 9 });
      drawCaption(doc, f.roleLabel, fx - 15, y + 72, 78, { size: 8, color: MUTED });
      fx += 110;
    });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(GREEN).text(data.chapterName.toUpperCase(), PAGE_MARGIN, y + 60, { width, align: "right" });
    doc.fillColor(INK).font("Helvetica");
    y += 60 + 24 + 14;
  }

  // Director / President / Secretary / Treasurer row.
  const coreOrder = ["DIRECTOR", "PRESIDENT", "SECRETARY", "TREASURER"];
  const core = coreOrder
    .map((key) => data.leadership.find((l) => l.roleKey === key))
    .filter((l): l is RosterLeadershipRow => Boolean(l));
  if (core.length > 0) {
    const slot = width / core.length;
    const coreBuffers = await Promise.all(core.map((entry) => fetchImageBuffer(entry.photoUrl)));
    core.forEach((entry, i) => {
      const cx = PAGE_MARGIN + i * slot;
      drawPhoto(doc, coreBuffers[i], cx + slot / 2 - 30, y, 60, entry.memberName);
      drawCaption(doc, entry.memberName, cx, y + 66, slot, { bold: true, size: 9 });
      drawCaption(doc, entry.roleLabel, cx, y + 78, slot, { size: 8, color: MUTED });
    });
    y += 96;
  }
}

async function renderMeetingRoles(doc: PDFKit.PDFDocument, data: RosterData) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  y = sectionHeading(doc, "Coordinators", PAGE_MARGIN, y, width);
  y += 16;

  if (data.roleAssignments.length === 0) {
    doc.fontSize(10).fillColor(MUTED).text("No coordinators have been assigned for this chapter yet.", PAGE_MARGIN, y);
    return;
  }

  const cols = 3;
  const cardWidth = width / cols;
  const cardHeight = 92;
  let col = 0;
  const buffers = await Promise.all(data.roleAssignments.map((r) => fetchImageBuffer(r.photoUrl)));

  data.roleAssignments.forEach((entry, i) => {
    if (col === cols) {
      col = 0;
      y += cardHeight;
    }
    if (y + cardHeight > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
      col = 0;
    }
    const cx = PAGE_MARGIN + col * cardWidth;
    drawPhoto(doc, buffers[i], cx + cardWidth / 2 - 24, y + 6, 48, entry.memberName);
    drawCaption(doc, entry.memberName, cx, y + 58, cardWidth, { bold: true, size: 9 });
    drawCaption(doc, entry.roleLabel, cx, y + 70, cardWidth, { size: 8, color: GREEN });
    col += 1;
  });
}

/** Reuses the "measure real wrapped height, don't assume a fixed row height" lesson from the old member-export.ts PDF (backlog #16) — a long name/company/address must never overlap the next row. */
async function renderMemberTable(doc: PDFKit.PDFDocument, data: RosterData) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  const colSno = 30;
  const colPhoto = 40;
  const colDetails = width * 0.4;
  const colCategory = width * 0.2;
  const colGive = (width - colSno - colPhoto - colDetails - colCategory) / 2;
  const colAsk = colGive;
  const pageBottom = doc.page.height - PAGE_MARGIN;

  let pageIndex = 1;
  let y = PAGE_MARGIN;

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(`Roster Page ${pageIndex}`, PAGE_MARGIN, y);
    y += 18;
    doc.rect(PAGE_MARGIN, y, width, 20).fillColor(GREEN).fill();
    doc.fillColor("#ffffff").fontSize(9);
    let cx = PAGE_MARGIN + 4;
    doc.text("S.no", cx, y + 6, { width: colSno });
    cx += colSno + colPhoto;
    doc.text("Member Details", cx, y + 6, { width: colDetails });
    cx += colDetails;
    doc.text("Category", cx, y + 6, { width: colCategory });
    cx += colCategory;
    doc.text("Give", cx, y + 6, { width: colGive });
    cx += colGive;
    doc.text("Ask", cx, y + 6, { width: colAsk });
    y += 20;
    doc.fillColor(INK).font("Helvetica").fontSize(9);
  }

  drawHeader();
  const buffers = await Promise.all(data.members.map((m) => fetchImageBuffer(m.photoUrl)));

  data.members.forEach((member, i) => {
    const detailLines = [member.name, member.company, member.address ?? "", [member.phone, member.email].filter(Boolean).join("  ·  ")].filter(Boolean);
    const detailText = detailLines.join("\n");
    doc.font("Helvetica").fontSize(8);
    const detailHeight = doc.heightOfString(detailText, { width: colDetails - 6 });
    const rowHeight = Math.max(54, detailHeight + 10);

    if (y + rowHeight > pageBottom) {
      doc.addPage();
      pageIndex += 1;
      y = PAGE_MARGIN;
      drawHeader();
    }

    let cx = PAGE_MARGIN + 4;
    doc.font("Helvetica-Bold").fontSize(9).text(String(i + 1).padStart(2, "0"), cx, y + rowHeight / 2 - 5, { width: colSno });
    cx += colSno;
    drawPhoto(doc, buffers[i], cx, y + 4, 36, member.name);
    cx += colPhoto;

    doc.font("Helvetica-Bold").fontSize(8.5).text(member.name, cx, y + 4, { width: colDetails - 6 });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED);
    doc.text(member.company, cx, doc.y, { width: colDetails - 6 });
    if (member.address) doc.text(member.address, cx, doc.y, { width: colDetails - 6 });
    const contactLine = [member.phone, member.email].filter(Boolean).join("  ·  ");
    if (contactLine) doc.text(contactLine, cx, doc.y, { width: colDetails - 6 });
    doc.fillColor(INK);

    cx += colDetails;
    doc.font("Helvetica").fontSize(8.5).text(member.category, cx, y + 4, { width: colCategory - 6 });

    cx += colCategory;
    doc.rect(cx, y, colGive, rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();
    cx += colGive;
    doc.rect(cx, y, colAsk, rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();

    doc.moveTo(PAGE_MARGIN, y + rowHeight).lineTo(PAGE_MARGIN + width, y + rowHeight).strokeColor(BORDER).lineWidth(0.5).stroke();

    y += rowHeight;
  });
}

function drawPageFooter(doc: PDFKit.PDFDocument) {
  doc.fillColor(MUTED).fontSize(8).font("Helvetica").text("www.buildersworldforum.com", PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 12);
  doc.fillColor(INK);
}

function renderSelfIntroAndCategories(doc: PDFKit.PDFDocument, data: RosterData) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  doc.rect(PAGE_MARGIN, y, width, 90).fillColor(GREEN).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text("Visitor Self-Introduction Format", PAGE_MARGIN + 12, y + 10);
  doc.font("Helvetica").fontSize(9);
  doc.text("You will be given 15 seconds to briefly introduce yourself. Please use the format below and kindly stick to the time.", PAGE_MARGIN + 12, y + 28, { width: width - 24 });
  doc.text("I am ______________________ (your name) from ______________________ (company name)", PAGE_MARGIN + 12, y + 48, { width: width - 24 });
  doc.text("We do ______________________________________________ (description of your products / services)", PAGE_MARGIN + 12, y + 62, { width: width - 24 });
  doc.text("I thank ______________________________________ (member name) for inviting me.", PAGE_MARGIN + 12, y + 76, { width: width - 24 });
  doc.fillColor(INK).font("Helvetica");
  y += 106;

  y = sectionHeading(doc, "Open Categories", PAGE_MARGIN, y, width);
  y += 10;

  if (data.openCategoryNames.length === 0) {
    doc.fontSize(9).fillColor(MUTED).text("Every active category is currently occupied in this chapter.", PAGE_MARGIN, y);
    doc.fillColor(INK);
    drawPageFooter(doc);
    return;
  }

  // Genuinely variable-length (this project's Category taxonomy holds one
  // row per available slot, not one row per profession — a chapter can
  // easily have 100+ open slots) — paginated explicitly rather than assumed
  // to fit one page, same "check the real bottom, don't guess" discipline
  // the member table above and the Coordinators grid already use.
  const cols = 3;
  const colWidth = width / cols;
  const pageBottom = doc.page.height - PAGE_MARGIN;
  const colY = [y, y, y];
  let col = 0;

  data.openCategoryNames.forEach((name) => {
    doc.fontSize(8.5).fillColor(INK);
    const label = `• ${name}`;
    const lineHeight = doc.heightOfString(label, { width: colWidth - 6 });

    if (colY[col] + lineHeight > pageBottom) {
      drawPageFooter(doc);
      doc.addPage();
      colY[0] = PAGE_MARGIN;
      colY[1] = PAGE_MARGIN;
      colY[2] = PAGE_MARGIN;
      col = 0;
    }

    doc.text(label, PAGE_MARGIN + col * colWidth, colY[col], { width: colWidth - 6 });
    colY[col] += lineHeight + 4;
    col = (col + 1) % cols;
  });

  doc.fillColor(INK);
  drawPageFooter(doc);
}

function renderPledgePage(doc: PDFKit.PDFDocument, visitorFeedbackQr: Buffer | null) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  y = sectionHeading(doc, "Builders World Forum Pledge", PAGE_MARGIN, y, width);
  y += 10;
  const pledge = [
    "We, Builders World Forum members, commit to valuing and supporting our fellow co-members to enhance their business success.",
    "We will prioritize referrals received from co-members, providing exceptional service and competitive pricing.",
    "We pledge to work collaboratively as a group, promoting unity and shared goals within the Builders World Forum.",
    "We are dedicated to contributing positively to the construction industry as a whole, fostering growth and innovation.",
  ];
  const qrSize = 90;
  const textWidth = visitorFeedbackQr ? width - qrSize - 20 : width;
  doc.fontSize(8.5).fillColor(INK);
  let cy = y;
  pledge.forEach((line) => {
    const label = `•  ${line}`;
    const lineHeight = doc.heightOfString(label, { width: textWidth });
    doc.text(label, PAGE_MARGIN, cy, { width: textWidth });
    cy += lineHeight + 6;
  });

  if (visitorFeedbackQr) {
    try {
      doc.image(visitorFeedbackQr, PAGE_MARGIN + width - qrSize, y, { width: qrSize, height: qrSize });
      doc.fontSize(7.5).fillColor(MUTED).text("Visitor Feedback", PAGE_MARGIN + width - qrSize, y + qrSize + 4, { width: qrSize, align: "center" });
      doc.fillColor(INK);
    } catch {
      // Skip silently — a broken QR image must never crash the PDF.
    }
  }

  drawPageFooter(doc);
}

async function renderInvitationFlyer(doc: PDFKit.PDFDocument, data: RosterData) {
  doc.addPage();
  const width = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  drawLogoBadge(doc, doc.page.width / 2 - 90, y);
  y += 40;

  // Box height is derived from the same fixed increments used to place the
  // content inside it (not a separate guessed number) — a mismatched guess
  // previously let the fee bar and date/time/venue line draw past the green
  // box's own bottom edge, landing white-on-white and invisible.
  const featured = data.chiefGuests[0];
  const HEADER_HEIGHT = 90;
  const GUEST_BLOCK_HEIGHT = 112;
  const FEE_BAR_HEIGHT = 36;
  const DATE_LINE_HEIGHT = 20;
  const BOTTOM_PADDING = 14;
  const boxHeight = HEADER_HEIGHT + (featured ? GUEST_BLOCK_HEIGHT : 0) + FEE_BAR_HEIGHT + DATE_LINE_HEIGHT + BOTTOM_PADDING;

  doc.rect(PAGE_MARGIN, y, width, boxHeight).fillColor(GREEN).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text(`${data.chapterName.toUpperCase()} MEETING INVITATION`, PAGE_MARGIN + 16, y + 16);
  doc.fontSize(14).text("NETWORKING FOR CONSTRUCTION MATERIAL SUPPLIERS AND PROFESSIONALS", PAGE_MARGIN + 16, y + 34, { width: width - 32 });

  let innerY = y + HEADER_HEIGHT;
  if (featured) {
    const buf = await fetchImageBuffer(featured.photoUrl);
    drawPhoto(doc, buf, doc.page.width / 2 - 30, innerY, 60, featured.name);
    drawCaption(doc, featured.name, PAGE_MARGIN + 16, innerY + 66, width - 32, { bold: true, size: 10, color: "#ffffff" });
    if (featured.designation) drawCaption(doc, featured.designation, PAGE_MARGIN + 16, innerY + 80, width - 32, { size: 8, color: "#ffffff" });
    if (featured.company) drawCaption(doc, featured.company, PAGE_MARGIN + 16, innerY + 92, width - 32, { bold: true, size: 8, color: "#ffffff" });
    innerY += GUEST_BLOCK_HEIGHT;
  }

  doc.roundedRect(PAGE_MARGIN + 16, innerY, width - 32, 24, 4).fillColor("#ffffff").fill();
  doc.fillColor(GREEN).font("Helvetica-Bold").fontSize(10).text(`Registration Fee: ${data.registrationFeeText} (Including Breakfast)`, PAGE_MARGIN + 16, innerY + 7, { width: width - 32, align: "center" });
  innerY += FEE_BAR_HEIGHT;

  const dateLabel = data.meetingStartsAt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = data.meetingStartsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const venueLabel = [data.meetingVenue, data.meetingAddress].filter(Boolean).join(", ");
  doc.fillColor("#ffffff").font("Helvetica").fontSize(9);
  doc.text(dateLabel, PAGE_MARGIN + 16, innerY, { width: (width - 32) / 3, align: "center" });
  doc.text(timeLabel, PAGE_MARGIN + 16 + (width - 32) / 3, innerY, { width: (width - 32) / 3, align: "center" });
  doc.text(venueLabel || "Venue to be confirmed", PAGE_MARGIN + 16 + ((width - 32) * 2) / 3, innerY, { width: (width - 32) / 3, align: "center" });

  doc.fillColor(INK).font("Helvetica");
  y += boxHeight + 30;

  doc.fontSize(11).font("Helvetica-Bold").text("Notes", PAGE_MARGIN, y);
  y += 18;
  doc.rect(PAGE_MARGIN, y, width, 220).strokeColor(BORDER).lineWidth(1).stroke();

  doc.fillColor(MUTED).fontSize(8).font("Helvetica").text("www.buildersworldforum.com", PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 12);
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

  await renderCover(doc, data);
  await renderMeetingRoles(doc, data);
  await renderMemberTable(doc, data);
  renderSelfIntroAndCategories(doc, data);
  renderPledgePage(doc, visitorFeedbackQr);
  await renderInvitationFlyer(doc, data);

  doc.end();
  return done;
}
