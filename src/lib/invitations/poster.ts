/**
 * Meeting Invitation Generator — the single shared drawing routine used for
 * both the live preview canvas and the downloaded PNG (spec §6: "use the
 * same rendering source for preview and export"). Pure canvas code, no
 * DOM/React dependencies.
 *
 * Layout (2026-10-03): a faithful recreation of the client's own reference
 * invitation ("Chennai Chapter-2 Meeting Invitation"), which is now the
 * pattern for every invite — light faceted background, centred logo +
 * wordmark + script tagline, a rounded green panel over a blurred photo
 * with the eyebrow line, mixed-weight headline and a lime "Chief Guests"
 * pill, up to three chief-guest cards overlapping the panel's lower edge,
 * the "What's in it for you?" row, a white details card (date/time/venue
 * with icons, website, QR + caption), the phone row with a "Call for
 * Registration" pill, and the lime registration-fee bar.
 *
 * Everything is laid out in the reference's own 900×1600 coordinate space
 * and scaled up for export, so positions can be read straight off it.
 */

const DESIGN_WIDTH = 900;
const DESIGN_HEIGHT = 1600;
const SCALE = 1.5;
export const POSTER_WIDTH = DESIGN_WIDTH * SCALE;
export const POSTER_HEIGHT = DESIGN_HEIGHT * SCALE;

export const MAX_INVITATION_GUESTS = 3;

export interface InvitationGuest {
  name: string;
  designation: string;
  organisation: string;
  /** Small line under the organisation, e.g. "Builders & Contractors". */
  organisationNote: string;
  photoUrl: string;
}

export interface InvitationPosterData {
  eyebrow: string;
  headline: string;
  guests: InvitationGuest[];
  whyAttendText: string;
  dateLabel: string;
  timeLabel: string;
  venueLabel: string;
  addressLabel: string;
  websiteLabel: string;
  contactPhones: string;
  ctaText: string;
  feeLabel: string;
  feeNote: string;
  isComplimentary: boolean;
  includeQr: boolean;
  qrCaption: string;
}

export interface InvitationPosterImages {
  /** Same order/length as data.guests; null where a guest has no photo. */
  guestPhotos: (HTMLImageElement | null)[];
  qrCode: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  background: HTMLImageElement | null;
}

export interface InvitationPosterFonts {
  sans: string;
  script: string;
}

// Reference palette — BWF green family.
const GREEN = "#1f9d48";
const GREEN_TEXT = "#1a9440";
const GREEN_DEEP = "#127a35";
const LIME = "#8cc63f";
const LIME_SOFT = "#d6edb4";
const INK = "#1d1d1d";
const INK_SOFT = "#3a3a3a";
const WHITE = "#ffffff";
const PAGE_BG = "#ededed";

// Headline words drawn in regular weight (the reference's "FOR" / "AND").
const CONNECTOR_WORDS = new Set(["FOR", "AND", "OF", "THE", "WITH", "TO", "IN", "AT", "ON", "&", "A", "AN", "BY"]);

function font(fonts: InvitationPosterFonts, weight: number, size: number) {
  return `${weight} ${size}px ${fonts.sans}`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

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

/** Shrinks the font until `text` fits `maxWidth`; returns the size used. */
function fitFont(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, text: string, weight: number, size: number, maxWidth: number, min = 9) {
  let s = size;
  ctx.font = font(fonts, weight, s);
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 0.5;
    ctx.font = font(fonts, weight, s);
  }
  return s;
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Draws an image covering the box (centre-cropped, biased towards the top for portraits). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.5) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) * focusY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

function drawPageBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Soft faceted geometry, as in the reference — large translucent planes.
  const facets: [number, number][][] = [
    [[0, 0], [380, 0], [0, 300]],
    [[520, 0], [900, 0], [900, 260]],
    [[900, 380], [620, 620], [900, 860]],
    [[0, 560], [260, 820], [0, 1040]],
    [[0, 1180], [340, 1600], [0, 1600]],
    [[900, 1120], [560, 1600], [900, 1600]],
    [[260, 0], [620, 0], [450, 180]],
  ];
  const tones = ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.45)", "rgba(210,210,210,0.35)", "rgba(255,255,255,0.4)", "rgba(220,220,220,0.4)", "rgba(255,255,255,0.5)", "rgba(230,230,230,0.35)"];
  facets.forEach((pts, i) => {
    ctx.fillStyle = tones[i % tones.length];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts.slice(1)) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Brand block
// ---------------------------------------------------------------------------

function drawBrand(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, logo: HTMLImageElement | null) {
  const cx = DESIGN_WIDTH / 2;
  if (logo) ctx.drawImage(logo, cx - 62, 56, 124, 124);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const word = "BUILDERS WORLD FORUM";
  ctx.font = font(fonts, 700, 25);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.5px";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = GREEN_DEEP;
  ctx.strokeText(word, cx, 199);
  ctx.fillStyle = "#3fb64a";
  ctx.fillText(word, cx, 199);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";

  ctx.font = `700 16px ${fonts.script}`;
  ctx.fillStyle = INK;
  ctx.fillText("Exclusive Forum for Construction Industry", cx, 221);
}

// ---------------------------------------------------------------------------
// Green panel
// ---------------------------------------------------------------------------

const PANEL = { x: 58, y: 260, w: 784, h: 570, r: 30 };

function drawPanel(ctx: CanvasRenderingContext2D, background: HTMLImageElement | null) {
  ctx.save();
  roundRectPath(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r);
  ctx.clip();
  ctx.fillStyle = GREEN;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);

  if (background && typeof document !== "undefined") {
    // Cheap, portable blur: draw tiny, then scale back up with smoothing
    // (ctx.filter isn't supported in every browser the admins use).
    const small = document.createElement("canvas");
    small.width = 72;
    small.height = Math.round((72 * PANEL.h) / PANEL.w);
    const sctx = small.getContext("2d");
    if (sctx) {
      drawCover(sctx, background, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = 0.9;
      ctx.drawImage(small, PANEL.x - 10, PANEL.y - 10, PANEL.w + 20, PANEL.h + 20);
      ctx.globalAlpha = 1;
    }
  }

  const overlay = ctx.createLinearGradient(0, PANEL.y, 0, PANEL.y + PANEL.h);
  overlay.addColorStop(0, "rgba(34,160,72,0.84)");
  overlay.addColorStop(0.55, "rgba(38,165,74,0.70)");
  overlay.addColorStop(1, "rgba(30,150,66,0.80)");
  ctx.fillStyle = overlay;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.restore();
}

/** Headline with connector words in regular weight, other words bold, wrapped and centred. */
function drawHeadline(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, text: string, top: number, maxWidth: number) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  let size = 40;
  let lines: string[][] = [];
  const widthOf = (w: string) => {
    ctx.font = font(fonts, CONNECTOR_WORDS.has(w) ? 500 : 700, size);
    return ctx.measureText(w).width;
  };
  const space = () => size * 0.28;

  // Shrink until it fits in 3 lines.
  for (; size >= 26; size -= 1) {
    lines = [];
    let line: string[] = [];
    let lineWidth = 0;
    for (const w of words) {
      const ww = widthOf(w);
      const next = line.length ? lineWidth + space() + ww : ww;
      if (next > maxWidth && line.length) {
        lines.push(line);
        line = [w];
        lineWidth = ww;
      } else {
        line.push(w);
        lineWidth = next;
      }
    }
    if (line.length) lines.push(line);
    if (lines.length <= 3) break;
  }

  const lineHeight = size * 1.15;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = WHITE;
  lines.forEach((line, i) => {
    const total = line.reduce((sum, w, j) => sum + widthOf(w) + (j ? space() : 0), 0);
    let x = DESIGN_WIDTH / 2 - total / 2;
    const y = top + size + i * lineHeight;
    ctx.textAlign = "left";
    for (const w of line) {
      ctx.font = font(fonts, CONNECTOR_WORDS.has(w) ? 500 : 700, size);
      ctx.fillText(w, x, y);
      x += ctx.measureText(w).width + space();
    }
  });
  return top + size + (lines.length - 1) * lineHeight;
}

function drawPill(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, text: string, cx: number, cy: number) {
  ctx.font = font(fonts, 600, 22);
  const w = ctx.measureText(text).width + 44;
  fillRoundRect(ctx, cx - w / 2, cy - 23, w, 46, 23, LIME);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 1);
  ctx.textBaseline = "alphabetic";
}

// ---------------------------------------------------------------------------
// Chief guest cards
// ---------------------------------------------------------------------------

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => /[A-Za-z]/.test(p))
    .slice(0, 2)
    .map((p) => p.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "")
    .join("");
}

function drawGuestCards(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, guests: InvitationGuest[], photos: (HTMLImageElement | null)[]) {
  const count = Math.min(guests.length, MAX_INVITATION_GUESTS);
  if (count === 0) return;
  const cardW = 245;
  const gap = 10;
  const total = count * cardW + (count - 1) * gap;
  const startX = DESIGN_WIDTH / 2 - total / 2;
  const photoTop = 646;
  const photoH = 204;
  const cardTop = 800;
  const cardBottom = 966;

  for (let i = 0; i < count; i++) {
    const g = guests[i];
    const x = startX + i * (cardW + gap);

    // White info card (its top hides behind the panel's lower edge + photo).
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.06)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    fillRoundRect(ctx, x, cardTop, cardW, cardBottom - cardTop, 18, WHITE);
    ctx.restore();

    // Lime photo frame.
    const px = x + 12;
    const pw = cardW - 24;
    fillRoundRect(ctx, px, photoTop, pw, photoH, 18, LIME);
    const photo = photos[i];
    if (photo) {
      ctx.save();
      roundRectPath(ctx, px + 3, photoTop + 3, pw - 6, photoH - 3, 16);
      ctx.clip();
      drawCover(ctx, photo, px + 3, photoTop + 3, pw - 6, photoH - 3, 0.2);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = font(fonts, 700, 64);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initialsOf(g.name) || "CG", px + pw / 2, photoTop + photoH / 2);
      ctx.textBaseline = "alphabetic";
    }

    const cx = x + cardW / 2;
    const maxText = cardW - 24;
    ctx.textAlign = "center";

    fitFont(ctx, fonts, g.name, 600, 19, maxText);
    ctx.fillStyle = GREEN_TEXT;
    ctx.fillText(truncate(ctx, g.name, maxText), cx, 883);

    if (g.designation) {
      fitFont(ctx, fonts, g.designation, 400, 13.5, maxText);
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(truncate(ctx, g.designation, maxText), cx, 904);
    }
    if (g.organisation) {
      fitFont(ctx, fonts, g.organisation, 600, 16, maxText);
      ctx.fillStyle = INK;
      ctx.fillText(truncate(ctx, g.organisation, maxText), cx, g.organisationNote ? 937 : 943);
    }
    if (g.organisationNote) {
      fitFont(ctx, fonts, g.organisationNote, 500, 10.5, maxText);
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(truncate(ctx, g.organisationNote, maxText), cx, 953);
    }
  }
}

// ---------------------------------------------------------------------------
// Icons (vector, green)
// ---------------------------------------------------------------------------

function iconCalendar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GREEN;
  fillRoundRect(ctx, x - 11, y - 9, 22, 19, 3, GREEN);
  ctx.fillStyle = WHITE;
  ctx.fillRect(x - 8, y - 2, 16, 1.6);
  ctx.fillStyle = GREEN;
  ctx.fillRect(x - 7, y - 13, 3, 6);
  ctx.fillRect(x + 4, y - 13, 3, 6);
}

function iconClock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 4.5, y + 3);
  ctx.stroke();
}

function iconPin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(x, y - 4, 9, Math.PI, 0);
  ctx.quadraticCurveTo(x + 9, y + 3, x, y + 13);
  ctx.quadraticCurveTo(x - 9, y + 3, x - 9, y - 4);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(x, y - 4, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

// Handset outline from the Lucide "phone" glyph (24×24 viewBox), filled.
const PHONE_PATH =
  "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";

function iconPhone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(x, y, 17, 0, Math.PI * 2);
  ctx.fill();
  if (typeof Path2D === "undefined") return;
  ctx.save();
  ctx.translate(x - 9.5, y - 9.5);
  ctx.scale(0.8, 0.8);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(PHONE_PATH));
  ctx.restore();
}

/** Text with ordinal suffixes ("25th") drawn as superscript, left-aligned at x. */
function drawWithOrdinals(ctx: CanvasRenderingContext2D, fonts: InvitationPosterFonts, text: string, x: number, y: number, size: number, maxWidth: number) {
  const s = fitFont(ctx, fonts, text, 400, size, maxWidth);
  const parts = text.split(/(\d+)(st|nd|rd|th)\b/i);
  let cursor = x;
  ctx.textAlign = "left";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const isSuffix = i % 3 === 2;
    ctx.font = font(fonts, 400, isSuffix ? s * 0.6 : s);
    ctx.fillText(part, cursor, isSuffix ? y - s * 0.38 : y);
    cursor += ctx.measureText(part).width;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function drawInvitationPoster(
  ctx: CanvasRenderingContext2D,
  data: InvitationPosterData,
  images: InvitationPosterImages,
  fonts: InvitationPosterFonts,
) {
  ctx.save();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  drawPageBackground(ctx);
  drawBrand(ctx, fonts, images.logo);
  drawPanel(ctx, images.background);

  // Eyebrow
  ctx.textAlign = "center";
  ctx.fillStyle = WHITE;
  fitFont(ctx, fonts, data.eyebrow.toUpperCase(), 600, 23, 720);
  ctx.fillText(data.eyebrow.toUpperCase(), DESIGN_WIDTH / 2, 316);

  const headlineBottom = drawHeadline(ctx, fonts, data.headline, 352, 680);

  const guestCount = Math.min(data.guests.length, MAX_INVITATION_GUESTS);
  if (guestCount > 0) {
    drawPill(ctx, fonts, guestCount === 1 ? "Chief Guest" : "Chief Guests", DESIGN_WIDTH / 2, Math.max(540, headlineBottom + 46));
    drawGuestCards(ctx, fonts, data.guests, images.guestPhotos);
  }

  // "What's in it for you?"
  const rowY = 1030;
  ctx.lineWidth = 2;
  ctx.strokeStyle = LIME;
  fillRoundRect(ctx, 58, rowY, 784, 96, 12, "rgba(255,255,255,0.35)");
  roundRectPath(ctx, 59, rowY + 1, 782, 94, 12);
  ctx.stroke();
  fillRoundRect(ctx, 72, rowY + 13, 280, 70, 4, LIME);
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitFont(ctx, fonts, "What’s in it for you?", 600, 23, 255);
  ctx.fillText("What’s in it for you?", 212, rowY + 49);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  let whySize = 20;
  let whyLines: string[] = [];
  for (; whySize >= 13; whySize -= 0.5) {
    ctx.font = font(fonts, 400, whySize);
    whyLines = wrapText(ctx, data.whyAttendText, 445);
    if (whyLines.length <= 3) break;
  }
  const whyLineH = whySize * 1.35;
  const whyTop = rowY + 48 - ((whyLines.length - 1) * whyLineH) / 2 + whySize * 0.35;
  whyLines.slice(0, 3).forEach((l, i) => ctx.fillText(l, 377, whyTop + i * whyLineH));

  // Details card
  const card = { x: 58, y: 1157, w: 784, h: 224 };
  fillRoundRect(ctx, card.x, card.y, card.w, card.h, 18, WHITE);
  const hasQr = data.includeQr && images.qrCode;
  const textMax = hasQr ? 470 : 700;
  ctx.fillStyle = INK;
  iconCalendar(ctx, 99, 1192);
  ctx.fillStyle = INK;
  drawWithOrdinals(ctx, fonts, data.dateLabel || "Date to be announced", 130, 1199, 20, textMax);
  iconClock(ctx, 99, 1238);
  ctx.fillStyle = INK;
  drawWithOrdinals(ctx, fonts, data.timeLabel || "Time to be announced", 130, 1245, 20, textMax);
  iconPin(ctx, 99, 1283);
  ctx.fillStyle = INK;
  const venue = [data.venueLabel, data.addressLabel].filter(Boolean).join(", ") || "Venue to be announced";
  ctx.font = font(fonts, 400, 20);
  const venueLines = wrapText(ctx, venue, textMax);
  if (venueLines.length > 1) {
    ctx.font = font(fonts, 400, 17);
    const two = wrapText(ctx, venue, textMax);
    ctx.fillText(two[0], 130, 1282);
    ctx.fillText(truncate(ctx, two.slice(1).join(" "), textMax), 130, 1303);
  } else {
    ctx.fillText(venue, 130, 1291);
  }
  if (data.websiteLabel) {
    fitFont(ctx, fonts, data.websiteLabel, 400, 23, textMax + 30);
    ctx.fillStyle = GREEN_TEXT;
    ctx.fillText(data.websiteLabel, 88, 1353);
  }
  if (hasQr && images.qrCode) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(images.qrCode, 640, 1184, 140, 140);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    fitFont(ctx, fonts, data.qrCaption, 400, 17.5, 210);
    ctx.fillText(data.qrCaption, 710, 1356);
  }

  // Phone row + CTA
  if (data.contactPhones) {
    iconPhone(ctx, 76, 1442);
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    fitFont(ctx, fonts, data.contactPhones, 400, 21, data.ctaText ? 480 : 740);
    ctx.fillText(data.contactPhones, 103, 1450);
  }
  if (data.ctaText) {
    ctx.font = font(fonts, 500, 20.5);
    const ctaW = Math.max(220, ctx.measureText(data.ctaText).width + 50);
    fillRoundRect(ctx, 842 - ctaW, 1414, ctaW, 54, 27, GREEN);
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.ctaText, 842 - ctaW / 2, 1442);
    ctx.textBaseline = "alphabetic";
  }

  // Fee bar
  fillRoundRect(ctx, 61, 1497, 779, 58, 10, LIME_SOFT);
  const segments: { text: string; weight: number; color: string; scale: number }[] = data.isComplimentary
    ? [
        { text: "Registration: ", weight: 400, color: INK, scale: 1 },
        { text: "Complimentary", weight: 700, color: GREEN_TEXT, scale: 1.05 },
        ...(data.feeNote ? [{ text: ` ${data.feeNote}`, weight: 400, color: INK, scale: 1 }] : []),
      ]
    : data.feeLabel
      ? [
          { text: "Registration Fee: ", weight: 400, color: INK, scale: 1 },
          { text: data.feeLabel, weight: 700, color: GREEN_TEXT, scale: 1.05 },
          ...splitFeeNote(data.feeNote),
        ]
      : [];
  if (segments.length) {
    let size = 27;
    const measure = () =>
      segments.reduce((sum, seg) => {
        ctx.font = font(fonts, seg.weight, size * seg.scale);
        return sum + ctx.measureText(seg.text).width;
      }, 0);
    while (size > 14 && measure() > 740) size -= 0.5;
    let x = DESIGN_WIDTH / 2 - measure() / 2;
    ctx.textAlign = "left";
    for (const seg of segments) {
      ctx.font = font(fonts, seg.weight, size * seg.scale);
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, x, 1536);
      x += ctx.measureText(seg.text).width;
    }
  }

  ctx.restore();
}

/** "+ GST 18% only (Including Breakfast)" → green "+ GST 18%" then ink " only (…)", as in the reference. */
function splitFeeNote(note: string) {
  if (!note) return [];
  const match = /^(\s*\+?\s*GST\s*\d+%?)(.*)$/i.exec(note);
  if (!match) return [{ text: ` ${note.trim()}`, weight: 400, color: INK, scale: 1 }];
  return [
    { text: match[1].trimStart().startsWith("+") ? match[1].trimStart() : ` ${match[1].trim()}`, weight: 400, color: GREEN_TEXT, scale: 0.85 },
    ...(match[2] ? [{ text: match[2], weight: 400, color: INK, scale: 1 }] : []),
  ];
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
