"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminSession, requireChapterAccess } from "@/lib/auth/rbac";
import { decideAbsenceReview } from "@/lib/attendance/absences";

export type DecideState = { error?: string };

/**
 * Phase 39 — an admin's decision on a 3-absences-in-a-row review. Courtesy
 * needs attendance:manage for the member's chapter; removing the member
 * needs members:manage (same gate as changing a member's status).
 */
export async function decideReview(_prev: DecideState | undefined, formData: FormData): Promise<DecideState> {
  const reviewId = String(formData.get("reviewId") ?? "");
  const kind = formData.get("kind");
  const note = String(formData.get("note") ?? "").trim();
  if (kind !== "courtesy" && kind !== "remove") return { error: "Choose a decision." };
  if (!note) return { error: kind === "courtesy" ? "Add a note, e.g. the medical reason." : "Add a reason for removing the member." };
  if (note.length > 1000) return { error: "Keep the note under 1000 characters." };

  const review = await db.absenceReview.findUnique({
    where: { id: reviewId },
    select: { status: true, lastAbsentMeetingAt: true, member: { select: { chapterId: true } } },
  });
  if (!review) return { error: "Review not found." };
  if (review.status !== "OPEN") return { error: "This review has already been decided." };

  await requireChapterAccess(review.member.chapterId, kind === "remove" ? "members:manage" : "attendance:manage");
  const session = await requireAdminSession();

  if (kind === "courtesy") {
    const raw = String(formData.get("excusedUntil") ?? "");
    const chosen = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59.999+05:30`) : new Date();
    if (Number.isNaN(chosen.getTime())) return { error: "Choose a valid date." };
    // Courtesy must at least cover the absences under review, or the
    // review would simply reopen at the next check.
    const excusedUntil = chosen < review.lastAbsentMeetingAt ? review.lastAbsentMeetingAt : chosen;
    await decideAbsenceReview(reviewId, session.user.id, { kind, note, excusedUntil });
  } else {
    await decideAbsenceReview(reviewId, session.user.id, { kind, note });
    revalidatePath("/admin/members");
    revalidatePath("/members");
    revalidatePath("/members/[slug]", "page");
    revalidatePath("/chapters/[slug]", "page");
    revalidatePath("/");
    revalidatePath("/apply");
  }

  revalidatePath("/admin/attendance/reviews");
  // The decided card leaves the open list, so confirm on the page itself.
  redirect(`/admin/attendance/reviews?decided=${encodeURIComponent(reviewId)}`);
}
