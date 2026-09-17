"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession, getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

/**
 * Spec §5: "Track visitor membership applications and approved conversions
 * ... Link the visitor profile to the eventual member profile while
 * preserving visitor history." Deliberately manual — no phone/email
 * auto-matching, since a wrong guess would silently mislink two different
 * people's histories.
 */
export async function linkVisitorToMember(
  visitorProfileId: string,
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const memberId = formData.get("memberId");
  if (typeof memberId !== "string" || !memberId) return { error: "Select a member.", success: false };

  // A visitor profile can carry attendances across several chapters — a
  // Chapter Admin (who holds no blanket attendance:manage grant, see
  // requireChapterAccess's own comment) may link it as long as they have
  // access to at least one of those chapters, same "encountered this
  // visitor at my own chapter's meeting" reasoning the rest of this page
  // uses.
  const scope = await getChapterScope("attendance:manage");
  const session = await requireAdminSession();

  if (scope !== "ALL") {
    const attendanceInScope = await db.visitorAttendance.findFirst({ where: { visitorProfileId, chapterId: scope } });
    if (!attendanceInScope) return { error: "You don't have access to this visitor.", success: false };
  }

  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "That member no longer exists.", success: false };

  await db.visitorProfile.update({ where: { id: visitorProfileId }, data: { convertedMemberId: memberId } });

  await logActivity({
    userId: session.user.id,
    action: "visitor_profile.linked_to_member",
    entity: "VisitorProfile",
    entityId: visitorProfileId,
    metadata: { memberId },
  });

  revalidatePath("/admin/visitors-attendance/profiles");
  return { error: undefined, success: true };
}
