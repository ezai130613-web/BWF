/**
 * Meeting Invitation Generator (client spec, 2026-09-18) — the single shared
 * drawing routine used for both the live preview canvas and the downloaded
 * PNG (spec §6: "use the same rendering source for preview and export
 * wherever practical"). Pure canvas drawing code, no DOM/React dependencies,
 * so it can run identically against a visible preview canvas or an
 * off-screen one.
 *
 * Brand: premium green (client correction, 2026-09-18 — not the brief's
 * original blue), matching the existing admin's emerald/gold palette
 * (src/components/admin/sidebar.tsx).
 *
 * Layout (2026-09-18 revision): restyled after a reference poster the client
 * supplied from another networking forum — dramatic centered headline,
 * plain descriptive paragraph, an icon-labeled detail row (time/fee/venue/
 * date, each in a circular gold badge) instead of stacked plain text, and a
 * decorative tagline plaque, all on the same dark/gold premium palette. No
 * background photo (the client's own instruction — the chief guest photo
 * fills that role instead) and no data fields were added: every element
 * below maps onto the exact same InvitationPosterData shape as before.
 */

export const POSTER_WIDTH = 1600;
export const POSTER_HEIGHT = 2000;

export interface InvitationPosterData {
  headingLine1: string;
  headingLine2: string;
  chapterLabel: string;
  guestName: string;
  guestDesignation: string;
  guestOrganisation: string;
  whyAttendText: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  addressLabel: string;
  feeLabel: string;
  isComplimentary: boolean;
  includeQr: boolean;
}

export interface InvitationPosterImages {
  guestPhoto: HTMLImageElement | null;
  qrCode: HTMLImageElement | null;
}

export interface InvitationPosterFonts {
  display: string;
  sans: string;
}

// Same design tokens as src/app/globals.css's `@theme` block (the ones the
// rest of /admin already renders with via bg-emerald-900/text-gold-300
// Tailwind utilities) — kept as literal hex here since canvas fillStyle
// can't read CSS custom properties.
const EMERALD_950 = "#03110c";
const EMERALD_900 = "#0a2118";
const GOLD_300 = "#e4cd9c";
const GOLD_400 = "#d8b879";
const GOLD_500 = "#c9a063";
const IVORY_100 = "#f4eee1";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draws text centered on centerX and returns the y just below the last line. */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
  return startY + lines.length * lineHeight;
}

function drawCircularImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const size = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - size) / 2;
  const sy = (img.naturalHeight - size) / 2;
  ctx.drawImage(img, sx, sy, size, size, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fill();
}

/** Small ornamental line-with-diamond divider, matching the reference poster's headline flourish. */
function drawFlourishDivider(ctx: CanvasRenderingContext2D, cx: number, y: number, width = 220) {
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, y);
  ctx.lineTo(cx - 14, y);
  ctx.moveTo(cx + 14, y);
  ctx.lineTo(cx + width / 2, y);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = GOLD_500;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
}

// ---- Detail-row icons — hand-drawn vector glyphs (not emoji) so they render
// as consistent gold line-art across every browser, matching the reference
// poster's monochrome icon style. ----

function drawClockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.34);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.28, cy - r * 0.06);
  ctx.stroke();
}

function drawRupeeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sansFont: string) {
  ctx.save();
  ctx.font = `700 ${Math.round(r * 1.05)}px ${sansFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₹", cx, cy + r * 0.05);
  ctx.restore();
}

function drawPinIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const width = r * 0.62;
  const topY = cy - r * 0.55;
  const bottomY = cy + r * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx, bottomY);
  ctx.bezierCurveTo(cx - width, bottomY - r * 0.55, cx - width, topY, cx, topY);
  ctx.bezierCurveTo(cx + width, topY, cx + width, bottomY - r * 0.55, cx, bottomY);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, topY + r * 0.38, r * 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const width = r * 1.15;
  const height = r * 1.0;
  const x = cx - width / 2;
  const y = cy - height / 2 + r * 0.08;
  ctx.strokeRect(x, y, width, height);
  ctx.beginPath();
  ctx.moveTo(x, y + height * 0.32);
  ctx.lineTo(x + width, y + height * 0.32);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width * 0.24, y - height * 0.14);
  ctx.lineTo(x + width * 0.24, y + height * 0.14);
  ctx.moveTo(x + width * 0.76, y - height * 0.14);
  ctx.lineTo(x + width * 0.76, y + height * 0.14);
  ctx.stroke();
  ctx.fillStyle = GOLD_400;
  ctx.beginPath();
  ctx.arc(cx, y + height * 0.66, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

/** The circular gold-ring badge every detail-row icon sits inside, matching the reference poster's icon treatment. */
function drawIconBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, diameter: number, draw: (r: number) => void) {
  const r = diameter / 2;
  ctx.save();
  ctx.fillStyle = EMERALD_950;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = GOLD_300;
  ctx.fillStyle = GOLD_300;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  draw(r * 0.62);
  ctx.restore();
}

export function drawInvitationPoster(
  ctx: CanvasRenderingContext2D,
  data: InvitationPosterData,
  images: InvitationPosterImages,
  fonts: InvitationPosterFonts,
) {
  const w = POSTER_WIDTH;
  const h = POSTER_HEIGHT;

  ctx.clearRect(0, 0, w, h);

  // Background: deep emerald gradient, full bleed, slightly darker at top
  // and bottom for a vignette-like depth (reference poster's dark corners).
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, EMERALD_950);
  bg.addColorStop(0.45, EMERALD_900);
  bg.addColorStop(1, EMERALD_950);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.textBaseline = "alphabetic";

  // ---- TOP BAR: brand block, left-aligned ----
  ctx.textAlign = "left";
  ctx.fillStyle = GOLD_300;
  ctx.font = `700 30px ${fonts.sans}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(data.headingLine1.toUpperCase(), 72, 92);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = IVORY_100;
  ctx.font = `600 26px ${fonts.sans}`;
  ctx.fillText(data.chapterLabel, 72, 128);

  // Curved gold divider beneath the top bar (reference's ribbon swoosh).
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 168);
  ctx.quadraticCurveTo(w / 2, 200, w, 156);
  ctx.stroke();

  ctx.textAlign = "center";

  // ---- HEADLINE ----
  let y = 300;
  const headlineGrad = ctx.createLinearGradient(0, y - 90, 0, y + 20);
  headlineGrad.addColorStop(0, "#f6e9c4");
  headlineGrad.addColorStop(0.55, GOLD_300);
  headlineGrad.addColorStop(1, GOLD_500);
  ctx.fillStyle = headlineGrad;
  ctx.font = `700 92px ${fonts.display}`;
  y = drawWrappedText(ctx, data.headingLine2.toUpperCase(), w / 2, y, w - 180, 98);

  y += 40;
  drawFlourishDivider(ctx, w / 2, y);
  y += 60;

  // ---- DESCRIPTION (Why Attend BWF?) ----
  if (data.whyAttendText) {
    ctx.fillStyle = IVORY_100;
    ctx.font = `400 32px ${fonts.sans}`;
    y = drawWrappedText(ctx, data.whyAttendText, w / 2, y, w - 300, 44);
  }
  y += 50;

  // ---- CHIEF GUEST ----
  const photoRadius = 130;
  if (images.guestPhoto) {
    const photoCenterY = y + photoRadius;
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, photoCenterY, photoRadius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD_500;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    drawCircularImage(ctx, images.guestPhoto, w / 2, photoCenterY, photoRadius);
    y = photoCenterY + photoRadius + 55;
  } else {
    y += 10;
  }

  if (data.guestName) {
    ctx.fillStyle = IVORY_100;
    ctx.font = `700 46px ${fonts.display}`;
    y = drawWrappedText(ctx, data.guestName, w / 2, y, w - 320, 54);

    const subtitleParts = [data.guestDesignation, data.guestOrganisation].filter(Boolean).join(", ");
    if (subtitleParts) {
      ctx.fillStyle = GOLD_300;
      ctx.font = `400 28px ${fonts.sans}`;
      y = drawWrappedText(ctx, subtitleParts, w / 2, y + 18, w - 360, 36);
    }
  }
  y += 50;

  // ---- TAGLINE PLAQUE (decorative, matching the reference's CTA banner) ----
  const plaqueHeight = 130;
  ctx.fillStyle = "rgba(244,238,225,0.06)";
  fillRoundedRect(ctx, 130, y, w - 260, plaqueHeight, 18);
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(130, y, w - 260, plaqueHeight);

  ctx.fillStyle = GOLD_300;
  ctx.font = `600 24px ${fonts.sans}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("CONNECT  ·  COLLABORATE  ·  GROW", w / 2, y + 52);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = IVORY_100;
  ctx.font = `italic 500 32px ${fonts.display}`;
  ctx.fillText("Be Part of Something Bigger!", w / 2, y + 98);

  y += plaqueHeight + 60;

  // ---- ICON DETAIL ROW: Time · Fee · Venue · Date ----
  const feeText = data.isComplimentary ? "Complimentary Entry" : data.feeLabel;
  type DetailColumn = { icon: (cx: number, cy: number, r: number) => void; lines: string[] };
  const allColumns: DetailColumn[] = [
    { icon: (cx: number, cy: number, r: number) => drawClockIcon(ctx, cx, cy, r), lines: [data.timeLabel].filter(Boolean) },
    { icon: (cx: number, cy: number, r: number) => drawRupeeIcon(ctx, cx, cy, r, fonts.sans), lines: [feeText].filter(Boolean) },
    {
      icon: (cx: number, cy: number, r: number) => drawPinIcon(ctx, cx, cy, r),
      lines: [data.venueLabel, data.addressLabel].filter(Boolean),
    },
    { icon: (cx: number, cy: number, r: number) => drawCalendarIcon(ctx, cx, cy, r), lines: [data.dateLabel].filter(Boolean) },
  ];
  const columns = allColumns.filter((col) => col.lines.length > 0);

  if (columns.length > 0) {
    const badgeDiameter = 108;
    const colWidth = (w - 120) / columns.length;
    const labelLineHeight = 30;
    const maxLinesPerColumn = 3; // bounds banner height regardless of how long a pasted venue/address is

    const primaryFont = `700 27px ${fonts.sans}`;
    const secondaryFont = `400 22px ${fonts.sans}`;

    // Wrap (and cap) each column's text before drawing, so the banner can be
    // sized to fit real content instead of a fixed guess — an earlier fixed-
    // height version let a long address wrap past the box into the QR below.
    const resolvedColumns = columns.map((col) => {
      const entries: { text: string; primary: boolean }[] = [];
      col.lines.forEach((line, li) => {
        ctx.font = li === 0 ? primaryFont : secondaryFont;
        for (const wrapped of wrapText(ctx, line, colWidth - 40)) entries.push({ text: wrapped, primary: li === 0 });
      });
      if (entries.length > maxLinesPerColumn) {
        const kept = entries.slice(0, maxLinesPerColumn);
        const last = kept[maxLinesPerColumn - 1];
        ctx.font = last.primary ? primaryFont : secondaryFont;
        let text = last.text;
        while (ctx.measureText(`${text}…`).width > colWidth - 40 && text.length > 1) {
          text = text.slice(0, -1).trimEnd();
        }
        kept[maxLinesPerColumn - 1] = { ...last, text: `${text}…` };
        return kept;
      }
      return entries;
    });

    const maxLines = Math.max(...resolvedColumns.map((entries) => entries.length), 1);
    const bannerHeight = badgeDiameter + 60 + maxLines * labelLineHeight + 30;

    ctx.fillStyle = "rgba(3,17,12,0.55)";
    fillRoundedRect(ctx, 60, y, w - 120, bannerHeight, 24);
    ctx.strokeStyle = GOLD_500;
    ctx.lineWidth = 1.5;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(60, y, w - 120, bannerHeight, 24);
      ctx.stroke();
    }

    const badgeCy = y + 40 + badgeDiameter / 2;

    columns.forEach((col, i) => {
      const colCx = 60 + colWidth * i + colWidth / 2;
      drawIconBadge(ctx, colCx, badgeCy, badgeDiameter, (r) => col.icon(colCx, badgeCy, r));

      let labelY = badgeCy + badgeDiameter / 2 + 44;
      for (const entry of resolvedColumns[i]) {
        ctx.fillStyle = entry.primary ? IVORY_100 : GOLD_300;
        ctx.font = entry.primary ? primaryFont : secondaryFont;
        ctx.fillText(entry.text, colCx, labelY);
        labelY += labelLineHeight;
      }

      // Vertical divider between columns.
      if (i > 0) {
        ctx.strokeStyle = "rgba(201,160,99,0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(60 + colWidth * i, y + 24);
        ctx.lineTo(60 + colWidth * i, y + bannerHeight - 24);
        ctx.stroke();
      }
    });

    y += bannerHeight + 50;
  }

  // ---- QR CODE ----
  if (data.includeQr && images.qrCode) {
    const qrSize = 200;
    const qrY = y;
    ctx.fillStyle = IVORY_100;
    ctx.fillRect(w / 2 - qrSize / 2 - 14, qrY - 14, qrSize + 28, qrSize + 28);
    ctx.drawImage(images.qrCode, w / 2 - qrSize / 2, qrY, qrSize, qrSize);

    ctx.fillStyle = GOLD_300;
    ctx.font = `600 26px ${fonts.sans}`;
    ctx.fillText("Scan to Register", w / 2, qrY + qrSize + 46);
    y = qrY + qrSize + 46;
  }

  // ---- CLOSING TAGLINE ----
  ctx.fillStyle = GOLD_300;
  ctx.font = `600 22px ${fonts.sans}`;
  ctx.letterSpacing = "2px";
  ctx.fillText("GREAT CONNECTIONS. ENDLESS OPPORTUNITIES.", w / 2, h - 76);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = IVORY_100;
  ctx.font = `italic 500 30px ${fonts.display}`;
  ctx.fillText("See You There!", w / 2, h - 38);
}

/** Loads an image and resolves once decoded — rejects on failure so callers can show a clear error rather than silently drawing nothing (requirement #9). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}
