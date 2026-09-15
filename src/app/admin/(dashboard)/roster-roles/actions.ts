"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const createSchema = z.object({
  label: z.string().min(1, "Name is required"),
});

/** "Digital Coordinator" -> "DIGITAL_COORDINATOR", matching the seeded roles' own key style. */
function roleKeyFromLabel(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Roster Sheet's "Coordinators" catalog — same admin-extensible pattern as
 * createLeadershipRole, and same chapters:manage gate (this is global
 * chapter-config, not the chapter-scoped roster:manage generation flow).
 */
export async function createRosterRole(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("chapters:manage");

  const parsed = createSchema.safeParse({ label: formData.get("label") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const key = roleKeyFromLabel(parsed.data.label);
  if (!key) return { error: "Name must contain at least one letter or number." };

  const existing = await db.rosterRole.findUnique({ where: { key } });
  if (existing) return { error: "A role with that name already exists." };

  const maxOrder = await db.rosterRole.aggregate({ _max: { order: true } });
  const role = await db.rosterRole.create({
    data: { key, label: parsed.data.label, order: (maxOrder._max.order ?? 0) + 1 },
  });

  await logActivity({
    userId: session.user.id,
    action: "roster_role.created",
    entity: "RosterRole",
    entityId: role.id,
  });

  // No standalone /admin/roster-roles page anymore — the catalog is managed
  // inline on every chapter's own detail page (2026-09-15 client correction).
  revalidatePath("/admin/chapters/[id]", "page");
  return { error: undefined };
}
