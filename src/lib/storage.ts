import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) object storage for member photos, brochures,
 * company logos, testimonial media, and blog/event images (backlog #8, see
 * docs/ARCHITECTURE.md's confirmed "Hosting" decision). STORAGE_* env vars
 * are deliberately NOT in src/lib/env.ts's strict schema — same "graceful
 * no-op until configured" pattern as OPENAI_API_KEY (src/lib/chatbot/
 * client.ts) and EMAIL_API_KEY (src/lib/email.ts): every form that uses
 * MediaUploadField falls back to plain URL entry until this is set.
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
    publicUrl: `${process.env.STORAGE_PUBLIC_URL}/${key}`,
    maxBytes: config.maxBytes,
  };
}
