"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

/** Pending Points tracker (2026-11-17) — gated by accounts:view (Super Admin + Accounts). */
const optional = (max: number) => z.string().max(max).optional().transform((v) => v?.trim() || undefined);
const dateField = z.string().optional().transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00+05:30`) : undefined));

const schema = z.object({
  title: z.string().trim().min(1, "Describe the pending point").max(300),
  details: optional(2000),
  remarks: optional(2000),
  chapterId: optional(60),
  assignedToUserId: optional(60),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
  raisedOn: dateField,
  expectedOn: dateField,
});

type Result = { error?: string; ok?: boolean } | undefined;

function parse(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." } as const;
  const { chapterId, assignedToUserId, raisedOn, expectedOn, status, ...rest } = parsed.data;
  return {
    data: {
      ...rest,
      status,
      chapterId: chapterId ?? null,
      assignedToUserId: assignedToUserId ?? null,
      expectedOn: expectedOn ?? null,
      ...(raisedOn ? { raisedOn } : {}),
    },
  } as const;
}

export async function savePendingItem(itemId: string | null, _prev: Result, formData: FormData): Promise<Result> {
  const session = await requirePermission("accounts:view");
  const result = parse(formData);
  if ("error" in result) return { error: result.error };

  if (itemId) {
    const existing = await db.pendingItem.findUnique({ where: { id: itemId }, select: { status: true, completedOn: true } });
    if (!existing) return { error: "That point no longer exists." };
    const completedOn = result.data.status === "DONE" ? (existing.completedOn ?? new Date()) : null;
    await db.pendingItem.update({ where: { id: itemId }, data: { ...result.data, completedOn } });
  } else {
    const item = await db.pendingItem.create({
      data: { ...result.data, completedOn: result.data.status === "DONE" ? new Date() : null, createdByUserId: session.user.id },
    });
    itemId = item.id;
  }
  await logActivity({ userId: session.user.id, action: "pending_item.saved", entity: "PendingItem", entityId: itemId, metadata: { title: result.data.title, status: result.data.status } });
  revalidatePath("/admin/accounts/pending-items");
  return { ok: true };
}

export async function deletePendingItem(itemId: string) {
  const session = await requirePermission("accounts:view");
  const item = await db.pendingItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.pendingItem.delete({ where: { id: itemId } });
  await logActivity({ userId: session.user.id, action: "pending_item.deleted", entity: "PendingItem", entityId: itemId, metadata: { title: item.title } });
  revalidatePath("/admin/accounts/pending-items");
}
