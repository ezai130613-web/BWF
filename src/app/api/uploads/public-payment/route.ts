import { z } from "zod";
import { NextResponse } from "next/server";
import { createPresignedUpload, isStorageConfigured, MEDIA_KINDS } from "@/lib/storage";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

/**
 * Public payment-screenshot upload — used by the /visit form (client
 * correction spec §40), the Apply for Membership form (user request,
 * 2026-09-09), and the public Visitor Management check-in form (2026-09-18).
 * Originally visitor-only (hence the route was first named
 * .../visitor-payment); renamed here once Apply grew the same need, rather
 * than duplicating this file or reusing a misleading name. Unlike
 * /api/uploads (every admin/member media field), this must work for a
 * signed-out public visitor/applicant, so it can't require a session — kept
 * as its own narrow route rather than loosening the general one: `kind` is
 * restricted to a small allowlist (not the full MEDIA_KINDS set) and the
 * route is IP rate-limited instead of trusting a logged-in identity.
 * `paymentProof` (image or PDF) was added for the Visitor Management form,
 * whose spec explicitly allows a PDF proof, unlike /visit and /apply which
 * only ever needed a screenshot — `image` stays the default so those two
 * callers are unaffected.
 */
const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  kind: z.enum(["image", "paymentProof"]).default("image"),
});

export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Object storage isn't configured yet — you can skip this and BWF will confirm payment directly." },
      { status: 503 },
    );
  }

  const ip = await getClientIp();
  const allowed = await rateLimit(`public-payment-upload:${ip}`, { limit: 20, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS_ERROR }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { filename, contentType, size, kind } = parsed.data;
  const maxBytes = MEDIA_KINDS[kind].maxBytes;
  if (size > maxBytes) {
    return NextResponse.json({ error: `File is too large — max ${Math.floor(maxBytes / (1024 * 1024))}MB.` }, { status: 400 });
  }

  try {
    const { uploadUrl, publicUrl } = await createPresignedUpload({ kind, filename, contentType });
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't start the upload." }, { status: 400 });
  }
}
