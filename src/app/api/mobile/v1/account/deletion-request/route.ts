import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { notifyAccountDeletionRequested } from "@/lib/notifications";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { json, MobileApiError, mobileHandler, readJson, requireMobileMember } from "@/lib/mobile/api";

const bodySchema = z.object({ reason: z.string().max(1000).optional() });

/**
 * "Delete my account" in the app (App Store guideline 5.1.1(v)). Records the
 * request in the audit log and emails BWF; the email runs after the response
 * so a mail failure can't fail the request.
 */
export const POST = mobileHandler(async (request: Request) => {
  const { user, member } = await requireMobileMember(request);
  if (!(await rateLimit(`deletion-request:${user.id}`, { limit: 3, windowSeconds: 86400 }))) {
    throw new MobileApiError(429, "RATE_LIMITED", TOO_MANY_REQUESTS_ERROR);
  }
  const { reason } = await readJson(request, bodySchema);
  const chapter = await db.chapter.findUniqueOrThrow({ where: { id: member.chapterId }, select: { name: true } });

  await logActivity({
    userId: user.id,
    action: "member.account_deletion_requested",
    entity: "Member",
    entityId: member.id,
    metadata: { reason: reason?.trim() || undefined, via: "mobile" },
  });

  after(async () => {
    try {
      await notifyAccountDeletionRequested({ memberName: member.name, memberId: member.id, chapter: chapter.name, reason: reason?.trim() || undefined });
    } catch (error) {
      console.error("notifyAccountDeletionRequested failed (request still logged):", error);
    }
  });

  return json({ ok: true });
});
