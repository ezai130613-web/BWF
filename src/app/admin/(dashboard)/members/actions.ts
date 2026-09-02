"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { computeActiveSlotKey, SLOT_TAKEN_ERROR } from "@/lib/members/slot";
import type { $Enums } from "@/generated/prisma/client";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  companyId: z.string().min(1, "Select a company"),
  chapterId: z.string().min(1, "Select a chapter"),
  categoryId: z.string().min(1, "Select a category"),
});

export async function createMember(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { chapterId, categoryId, companyId, ...rest } = parsed.data;

  // Central/Super Admin can create in any chapter; a Chapter Admin only in
  // their own — enforced here, not just hidden in the UI.
  await requireChapterAccess(chapterId, "members:manage");

  try {
    const member = await db.member.create({
      data: {
        ...rest,
        email: rest.email || undefined,
        companyId,
        chapterId,
        categoryId,
        activeSlotKey: computeActiveSlotKey("ACTIVE", chapterId, categoryId),
      },
    });

    await logActivity({
      action: "member.created",
      entity: "Member",
      entityId: member.id,
      metadata: { chapterId, categoryId },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "activeSlotKey")) {
      return { error: SLOT_TAKEN_ERROR };
    }
    throw error;
  }

  revalidatePath("/admin/members");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/");
  return { error: undefined };
}

export async function updateMemberStatus(memberId: string, status: $Enums.MemberStatus) {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  await requireChapterAccess(member.chapterId, "members:manage");

  try {
    await db.member.update({
      where: { id: memberId },
      data: {
        status,
        activeSlotKey: computeActiveSlotKey(status, member.chapterId, member.categoryId),
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "activeSlotKey")) {
      throw new Error(SLOT_TAKEN_ERROR);
    }
    throw error;
  }

  await logActivity({
    action: "member.status_changed",
    entity: "Member",
    entityId: memberId,
    metadata: { status },
  });

  revalidatePath("/admin/members");
  revalidatePath("/chapters");
  revalidatePath("/chapters/[slug]", "page");
  revalidatePath("/");
}

function isUniqueConstraintError(error: unknown, field: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002" &&
    "meta" in error &&
    JSON.stringify((error as { meta?: unknown }).meta).includes(field)
  );
}
