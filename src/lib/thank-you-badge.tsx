import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";

/**
 * 2026-11-17 client request — "download as image" for the thank-you banner,
 * on the website and in the mobile app. Rendered once on the server (so
 * both clients get an identical PNG and member photos load without browser
 * CORS limits). Layout mirrors components/member/share-banner.tsx: the GIVER
 * leads (photo, "Big thanks to …", company); the receiver signs off at the
 * bottom. Only the two members on a slip may download it.
 */

const W = 1080;
const H = 1350;
const GOLD = "#e6c36a";
const IVORY = "#f6f1e4";

async function logoDataUri(): Promise<string | null> {
  try {
    const file = await readFile(path.join(process.cwd(), "public/images/brand/bwf-logo-180.png"));
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Server-side fetch → data URI, so the renderer never depends on the remote host's CORS. Any failure just means "show the initial". */
async function photoDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Satori decodes PNG/JPEG only; anything else (or anything huge) falls back to the initial.
    if (buf.length > 3_000_000 || !/png|jpe?g/i.test(type)) return null;
    return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function renderThankYouBadge(slipId: string, viewerMemberId: string): Promise<Response> {
  const slip = await db.thankYouSlip.findUnique({
    where: { id: slipId },
    include: {
      // fromMember recorded the slip = received the business; toMember gave it.
      fromMember: { select: { id: true, name: true, company: { select: { name: true } }, chapter: { select: { name: true } } } },
      toMember: { select: { id: true, name: true, photoUrl: true, company: { select: { name: true } } } },
    },
  });
  if (!slip || (slip.fromMemberId !== viewerMemberId && slip.toMemberId !== viewerMemberId)) {
    return new Response("Not found", { status: 404 });
  }
  const giver = slip.toMember;
  const receiver = slip.fromMember;
  const [logo, photo] = await Promise.all([logoDataUri(), photoDataUri(giver.photoUrl)]);
  const amount = formatInr(String(slip.amountInr)) ?? `₹${slip.amountInr}`;
  const date = slip.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "linear-gradient(145deg, #022c22 0%, #064e3b 55%, #065f46 100%)",
          color: IVORY,
          padding: "64px 72px",
          border: `6px solid ${GOLD}55`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {logo ? <img src={logo} width={64} height={64} alt="" /> : null}
          <div style={{ fontSize: 34 }}>Builders World Forum</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 24, letterSpacing: 7, color: GOLD, textTransform: "uppercase" }}>Thank you for the business</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", textAlign: "center" }}>
          {photo ? (
            <img src={photo} width={260} height={260} alt="" style={{ borderRadius: 130, border: `8px solid ${GOLD}`, objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 260,
                height: 260,
                borderRadius: 130,
                border: `8px solid ${GOLD}`,
                background: `${GOLD}33`,
                color: GOLD,
                fontSize: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {giver.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: 44, fontSize: 50, lineHeight: 1.25 }}>
            <span>Big thanks to&nbsp;</span>
            <span style={{ color: GOLD }}>{giver.name}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 40, color: `${IVORY}cc` }}>for giving me business worth</div>
          <div style={{ marginTop: 18, fontSize: 112, color: GOLD }}>{amount}</div>
          <div style={{ marginTop: 18, fontSize: 36 }}>{giver.company.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", borderTop: `2px solid ${GOLD}44`, paddingTop: 28 }}>
          <div style={{ fontSize: 20, letterSpacing: 5, color: `${IVORY}99`, textTransform: "uppercase" }}>With gratitude</div>
          <div style={{ marginTop: 10, fontSize: 38 }}>{receiver.name}</div>
          <div style={{ marginTop: 4, fontSize: 26, color: `${IVORY}bb` }}>{receiver.company.name}</div>
          <div style={{ marginTop: 18, fontSize: 22, color: `${IVORY}99` }}>
            {`${date} · ${receiver.chapter.name}`}
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
  const body = await image.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="bwf-thank-you-${slip.id}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
