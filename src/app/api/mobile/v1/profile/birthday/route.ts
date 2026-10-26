import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { birthdayFields, birthdayInputSchema } from "@/lib/members/birthdays";
import { invalid, json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { BirthdayUpdateResponse } from "@/lib/mobile/contract";

/**
 * Phase 37 — the member sets their own birthday. Saved directly (not public
 * profile content, so no approval queue — same as the portal's My Profile).
 */
export const POST = mobileHandler(async (request: Request) => {
  const { user, member } = await requireMobileMember(request);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const asInput = (v: unknown) => (typeof v === "number" || typeof v === "string" ? v : undefined);
  const parsed = birthdayInputSchema.safeParse({ day: asInput(body?.day), month: asInput(body?.month), year: asInput(body?.year) });
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Invalid birthday.");

  await db.member.update({ where: { id: member.id }, data: birthdayFields(parsed.data) });
  await logActivity({ userId: user.id, action: "member.birthday_updated", entity: "Member", entityId: member.id, metadata: { by: "member", via: "app" } });

  const response: BirthdayUpdateResponse = { ok: true, myBirthday: parsed.data };
  return json(response);
});
