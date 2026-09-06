import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { createPresignedUpload, isStorageConfigured, MEDIA_KINDS } from "@/lib/storage";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

/**
 * Issues a presigned R2 upload URL for MediaUploadField (backlog #8). Open
 * to any signed-in session (admin or member), not permission-gated per
 * entity type — same trust level as pasting a URL directly into these forms
 * today, which no permission check gates either. The permission check that
 * matters is on the actual profile/entity write this URL ends up in
 * (updateMemberProfile, submitProfileRevision, createCompany, etc.).
 */
const bodySchema = z.object({
  kind: z.enum(["image", "pdf", "video"]),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Object storage isn't configured yet — paste a URL directly instead." }, { status: 503 });
  }

  const allowed = await rateLimit(`upload:${session.user.id}`, { limit: 30, windowSeconds: 600 });
  if (!allowed) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS_ERROR }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { kind, filename, contentType, size } = parsed.data;
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
