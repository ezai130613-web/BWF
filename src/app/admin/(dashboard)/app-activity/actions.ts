"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { requireAdminSession, requirePermission } from "@/lib/auth/rbac";

/** Phase 20 Batch 5 — "Jump to member" on /admin/app-activity. A Server Action so it can redirect to a computed dynamic path with zero client JS (a plain GET form can only append query params to a fixed URL). */
export async function jumpToMember(formData: FormData) {
  await requireAdminSession();
  const memberId = formData.get("memberId");
  if (typeof memberId === "string" && memberId) {
    redirect(`/admin/app-activity/${memberId}`);
  }
}

/**
 * 2026-11-09 — admins correct a member's points after the system has awarded
 * them. Gated by points_config:manage (the same people who set the scoring
 * rules); each change is a signed, reasoned row, never an overwrite.
 */
const adjustmentSchema = z.object({
  memberId: z.string().min(1),
  points: z.coerce
    .number("Enter the points to add or remove")
    .int("Enter a whole number of points")
    .refine((n) => n !== 0, "Enter a number other than 0 (use a minus sign to remove points)")
    .refine((n) => Math.abs(n) <= 100_000, "That's too large"),
  reason: z.string().trim().min(3, "Give a short reason so the change can be understood later").max(500),
});

export async function addPointsAdjustment(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const session = await requirePermission("points_config:manage");
  const parsed = adjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const member = await db.member.findUnique({ where: { id: parsed.data.memberId }, select: { id: true } });
  if (!member) return { error: "Member not found." };

  const adjustment = await db.pointsAdjustment.create({ data: { ...parsed.data, createdByUserId: session.user.id } });
  await logActivity({
    userId: session.user.id,
    action: "points_adjustment.created",
    entity: "PointsAdjustment",
    entityId: adjustment.id,
    metadata: parsed.data,
  });
  revalidateScorePages(parsed.data.memberId);
  return { ok: true };
}

export async function deletePointsAdjustment(adjustmentId: string) {
  const session = await requirePermission("points_config:manage");
  const adjustment = await db.pointsAdjustment.findUnique({ where: { id: adjustmentId } });
  if (!adjustment) return;

  await db.pointsAdjustment.delete({ where: { id: adjustmentId } });
  await logActivity({
    userId: session.user.id,
    action: "points_adjustment.deleted",
    entity: "PointsAdjustment",
    entityId: adjustmentId,
    metadata: { memberId: adjustment.memberId, points: adjustment.points, reason: adjustment.reason },
  });
  revalidateScorePages(adjustment.memberId);
}

function revalidateScorePages(memberId: string) {
  revalidatePath(`/admin/app-activity/${memberId}`);
  revalidatePath("/admin/app-activity");
  revalidatePath("/member/points");
  revalidatePath("/member");
}
