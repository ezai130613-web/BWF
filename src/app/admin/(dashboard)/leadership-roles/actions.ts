"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const createSchema = z.object({
  label: z.string().min(1, "Name is required"),
});

/** "Vice President" -> "VICE_PRESIDENT", matching the seeded roles' own key style. */
function roleKeyFromLabel(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Brief §22: "Do not hardcode leadership roles" — was seed-script-only through Phase 9; this is the admin UI for it (backlog #9). */
export async function createLeadershipRole(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = createSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const key = roleKeyFromLabel(parsed.data.label);
  if (!key) return { error: "Name must contain at least one letter or number." };

  const existing = await db.chapterLeadershipRole.findUnique({ where: { key } });
  if (existing) return { error: "A role with that name already exists." };

  const role = await db.chapterLeadershipRole.create({ data: { key, label: parsed.data.label } });

  await logActivity({
    userId: session.user.id,
    action: "leadership_role.created",
    entity: "ChapterLeadershipRole",
    entityId: role.id,
  });

  revalidatePath("/admin/leadership-roles");
  return { error: undefined };
}
