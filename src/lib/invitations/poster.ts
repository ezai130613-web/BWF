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
const EMERALD_900 = "#0a2118";
const EMERALD_800 = "#123d2c";
const GOLD_300 = "#e4cd9c";
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

export function drawInvitationPoster(
  ctx: CanvasRenderingContext2D,
  data: InvitationPosterData,
  images: InvitationPosterImages,
  fonts: InvitationPosterFonts,
) {
  const w = POSTER_WIDTH;
  const h = POSTER_HEIGHT;

  // Background: deep emerald gradient, full bleed.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, EMERALD_900);
  bg.addColorStop(1, EMERALD_800);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Gold frame.
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 28, w - 56, h - 56);

  ctx.textAlign = "center";

  // ---- TOP SECTION ----
  ctx.fillStyle = GOLD_300;
  ctx.font = `600 32px ${fonts.sans}`;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "6px";
  ctx.fillText(data.headingLine1.toUpperCase(), w / 2, 130);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = IVORY_100;
  ctx.font = `700 64px ${fonts.display}`;
  ctx.fillText(data.headingLine2.toUpperCase(), w / 2, 210);

  ctx.fillStyle = GOLD_300;
  ctx.font = `500 36px ${fonts.sans}`;
  ctx.fillText(data.chapterLabel, w / 2, 270);

  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 120, 300);
  ctx.lineTo(w / 2 + 120, 300);
  ctx.stroke();

  // ---- MIDDLE SECTION: Chief Guest ----
  const photoCenterY = 480;
  const photoRadius = 160;

  if (images.guestPhoto) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, photoCenterY, photoRadius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD_500;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
    drawCircularImage(ctx, images.guestPhoto, w / 2, photoCenterY, photoRadius);
  }

  let guestBlockY = images.guestPhoto ? photoCenterY + photoRadius + 70 : 380;

  if (data.guestName) {
    ctx.fillStyle = IVORY_100;
    ctx.font = `700 48px ${fonts.display}`;
    guestBlockY = drawWrappedText(ctx, data.guestName, w / 2, guestBlockY, w - 320, 56);

    const subtitleParts = [data.guestDesignation, data.guestOrganisation].filter(Boolean).join(", ");
    if (subtitleParts) {
      ctx.fillStyle = GOLD_300;
      ctx.font = `400 30px ${fonts.sans}`;
      guestBlockY = drawWrappedText(ctx, subtitleParts, w / 2, guestBlockY + 20, w - 360, 38);
    }
  }

  // ---- WHY ATTEND SECTION ----
  // The minimum floor only matters when a photo pushes the guest block down
  // — without one, anchoring to the same floor would leave a large dead gap
  // in the middle of the poster.
  const whyAttendTop = Math.max(guestBlockY + 60, images.guestPhoto ? 980 : 640);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  const cardX = 110;
  const cardWidth = w - 220;
  const cardHeight = 210;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(cardX, whyAttendTop, cardWidth, cardHeight, 16);
  } else {
    ctx.rect(cardX, whyAttendTop, cardWidth, cardHeight);
  }
  ctx.fill();

  ctx.fillStyle = IVORY_100;
  ctx.font = `italic 400 30px ${fonts.display}`;
  drawWrappedText(ctx, `"${data.whyAttendText}"`, w / 2, whyAttendTop + 60, cardWidth - 100, 42);

  // ---- BOTTOM SECTION: meeting details ----
  let detailY = whyAttendTop + cardHeight + 90;
  ctx.font = `600 34px ${fonts.sans}`;
  ctx.fillStyle = GOLD_300;

  const details: string[] = [];
  const dateTime = [data.dateLabel, data.timeLabel].filter(Boolean).join(" · ");
  if (dateTime) details.push(dateTime);
  if (data.venueLabel) details.push(data.venueLabel);
  if (data.addressLabel) details.push(data.addressLabel);
  const feeText = data.isComplimentary ? "Complimentary Entry" : data.feeLabel;
  if (feeText) details.push(feeText);

  for (const [i, line] of details.entries()) {
    const isFeeLine = feeText !== "" && line === feeText;
    ctx.fillStyle = isFeeLine ? GOLD_300 : IVORY_100;
    ctx.font = i === 0 ? `700 38px ${fonts.sans}` : `400 30px ${fonts.sans}`;
    detailY = drawWrappedText(ctx, line, w / 2, detailY, w - 280, i === 0 ? 44 : 38) + 10;
  }

  // ---- QR CODE ----
  if (data.includeQr && images.qrCode) {
    const qrSize = 220;
    // Anchors near the bottom by default, but pushes further down if a long
    // venue/address wrapped onto extra lines above it (requirement #6).
    const qrY = Math.max(detailY + 30, h - 360);
    ctx.fillStyle = IVORY_100;
    ctx.fillRect(w / 2 - qrSize / 2 - 16, qrY - 16, qrSize + 32, qrSize + 32);
    ctx.drawImage(images.qrCode, w / 2 - qrSize / 2, qrY, qrSize, qrSize);

    ctx.fillStyle = GOLD_300;
    ctx.font = `600 28px ${fonts.sans}`;
    ctx.fillText("Scan to Register", w / 2, qrY + qrSize + 50);
  }

  // Footer rule.
  ctx.strokeStyle = GOLD_500;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 100, h - 60);
  ctx.lineTo(w / 2 + 100, h - 60);
  ctx.stroke();
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
