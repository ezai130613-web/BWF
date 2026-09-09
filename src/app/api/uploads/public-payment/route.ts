import { z } from "zod";
import { NextResponse } from "next/server";
import { createPresignedUpload, isStorageConfigured, MEDIA_KINDS } from "@/lib/storage";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

/**
 * Public payment-screenshot upload — used by both the /visit form (client
 * correction spec §40) and the Apply for Membership form (user request,
 * 2026-09-09). Originally visitor-only (hence the route was first named
 * .../visitor-payment); renamed here once Apply grew the same need, rather
 * than duplicating this file or reusing a misleading name. Unlike
 * /api/uploads (every admin/member media field), this must work for a
 * signed-out public visitor/applicant, so it can't require a session — kept
 * as its own narrow route rather than loosening the general one: locked to
 * `kind: "image"` only and IP rate-limited instead of trusting a logged-in
 * identity.
 */
const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
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

  const { filename, contentType, size } = parsed.data;
  const maxBytes = MEDIA_KINDS.image.maxBytes;
  if (size > maxBytes) {
    return NextResponse.json({ error: `File is too large — max ${Math.floor(maxBytes / (1024 * 1024))}MB.` }, { status: 400 });
  }

  try {
    const { uploadUrl, publicUrl } = await createPresignedUpload({ kind: "image", filename, contentType });
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't start the upload." }, { status: 400 });
  }
}
