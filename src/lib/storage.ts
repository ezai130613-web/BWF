import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) object storage for member photos, brochures,
 * company logos, testimonial media, and blog images (backlog #8, see
 * docs/ARCHITECTURE.md's confirmed "Hosting" decision). STORAGE_* env vars
 * are deliberately NOT in src/lib/env.ts's strict schema — same "graceful
 * no-op until configured" pattern as EMAIL_API_KEY (src/lib/email.ts): every
 * form that uses MediaUploadField falls back to plain URL entry until this
 * is set.
 */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.STORAGE_ACCOUNT_ID &&
      process.env.STORAGE_ACCESS_KEY_ID &&
      process.env.STORAGE_SECRET_ACCESS_KEY &&
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_PUBLIC_URL,
  );
}

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
      },
    });
  }
  return cachedClient;
}

/**
 * One entry per media use case in the brief's model list — bounds both
 * what an upload is allowed to be (content-type allowlist, brief §47's
 * "no YouTube/Instagram embeds" rule stays enforced by simply never
 * offering upload for those) and how large it can get before it hits R2.
 */
export const MEDIA_KINDS = {
  image: {
    folder: "images",
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
    maxBytes: 10 * 1024 * 1024,
  },
  pdf: {
    folder: "documents",
    contentTypes: ["application/pdf"],
    maxBytes: 20 * 1024 * 1024,
  },
  video: {
    folder: "videos",
    contentTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 200 * 1024 * 1024,
  },
  /// Marketing module (2026-09-16) — a separate, larger cap from `video`
  /// above: member/testimonial videos are supporting media, but a marketing
  /// upload IS the product being published, and needs headroom up to Meta's
  /// and Pinterest's own stated video-Pin/Reel size ceilings (~1-2GB) rather
  /// than the 200MB cap sized for a member profile clip. R2 receives this via
  /// a direct browser PUT (see createPresignedUpload's own comment) so this
  /// isn't bounded by Vercel's function body-size limits either way.
  marketingVideo: {
    folder: "marketing-videos",
    contentTypes: ["video/mp4", "video/quicktime"],
    maxBytes: 2 * 1024 * 1024 * 1024,
  },
  /// QR Code / Attendance / Payment system (2026-09-17) — the spec's own
  /// "screenshot, receipt or PDF" wording means this is the one media kind
  /// in this app that accepts both image and PDF content types at once.
  paymentProof: {
    folder: "payment-proofs",
    contentTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
  /// Apply form Aadhaar card (2026-10-19). Uploaded publicly (signed-out
  /// applicants) but its URL is never handed out: the application stores
  /// only the object key, and admins read it via createSignedDownloadUrl().
  identityDocument: {
    folder: "identity-documents",
    contentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
} as const satisfies Record<string, { folder: string; contentTypes: readonly string[]; maxBytes: number }>;

export type MediaKind = keyof typeof MEDIA_KINDS;

/**
 * Issues a presigned PUT URL so the browser uploads straight to R2 —
 * nothing routes through a Next.js server function, which matters on
 * Vercel where deployed functions cap request bodies well under the
 * 200MB a member video is allowed to be. The server never sees file
 * bytes, only the filename/content-type used to validate and mint the
 * signed URL.
 */
export async function createPresignedUpload(input: { kind: MediaKind; filename: string; contentType: string }) {
  if (!isStorageConfigured()) {
    throw new Error("Object storage is not configured.");
  }

  const config = MEDIA_KINDS[input.kind];
  if (!(config.contentTypes as readonly string[]).includes(input.contentType)) {
    throw new Error(`"${input.contentType}" isn't an allowed file type for ${input.kind} uploads.`);
  }

  const extension = input.filename.includes(".") ? input.filename.slice(input.filename.lastIndexOf(".")) : "";
  const key = `${config.folder}/${randomUUID()}${extension}`;

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: key, ContentType: input.contentType }),
    { expiresIn: 5 * 60 },
  );

  return {
    uploadUrl,
    key,
    publicUrl: `${process.env.STORAGE_PUBLIC_URL}/${key}`,
    maxBytes: config.maxBytes,
  };
}

/** True when `url` points at an object in our own bucket — used to refuse arbitrary URLs submitted through public forms. */
export function isOwnStorageUrl(url: string, kind: MediaKind): boolean {
  const base = process.env.STORAGE_PUBLIC_URL;
  if (!base) return false;
  return url.startsWith(`${base}/${MEDIA_KINDS[kind].folder}/`);
}

/** True when `key` has the exact shape createPresignedUpload() issues for `kind`. */
export function isOwnStorageKey(key: string, kind: MediaKind): boolean {
  const folder = MEDIA_KINDS[kind].folder;
  return new RegExp(`^${folder}/[0-9a-f-]{36}(\\.[A-Za-z0-9]{1,8})?$`).test(key);
}

/** Short-lived signed GET link for a private object (e.g. an applicant's Aadhaar card). */
export async function createSignedDownloadUrl(key: string, expiresInSeconds = 5 * 60) {
  if (!isStorageConfigured()) {
    throw new Error("Object storage is not configured.");
  }
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
