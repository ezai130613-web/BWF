import { z } from "zod";
import { createPresignedUpload, isStorageConfigured, MEDIA_KINDS } from "@/lib/storage";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { invalid, json, MobileApiError, mobileHandler, readJson, requireMobileMember } from "@/lib/mobile/api";
import type { UploadTicket } from "@/lib/mobile/contract";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

/**
 * Presigned R2 upload for a payment screenshot/receipt (image or PDF) — the
 * app PUTs the file straight to storage, then submits the returned
 * publicUrl as proofUrl. Same limits as the web's /api/uploads.
 */
export const POST = mobileHandler(async (request: Request) => {
  const { user } = await requireMobileMember(request);
  if (!isStorageConfigured()) throw new MobileApiError(503, "UNAVAILABLE", "Uploads aren't available right now. Please try again later.");
  if (!(await rateLimit(`upload:${user.id}`, { limit: 30, windowSeconds: 600 }))) {
    throw new MobileApiError(429, "RATE_LIMITED", TOO_MANY_REQUESTS_ERROR);
  }

  const { filename, contentType, size } = await readJson(request, bodySchema);
  const { maxBytes } = MEDIA_KINDS.paymentProof;
  if (size > maxBytes) throw invalid(`File is too large — max ${Math.floor(maxBytes / (1024 * 1024))}MB.`);

  let ticket;
  try {
    ticket = await createPresignedUpload({ kind: "paymentProof", filename, contentType });
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : "Couldn't start the upload.");
  }
  const body: UploadTicket = { uploadUrl: ticket.uploadUrl, publicUrl: ticket.publicUrl, maxBytes };
  return json(body);
});
