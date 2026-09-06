"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireChapterAccess, requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import type { $Enums } from "@/generated/prisma/client";

/**
 * A chapterless lead (chatbot, an unassigned waitlist enquiry) has no
 * chapter for requireChapterAccess() to scope against, so it's reachable
 * only through the blanket leads:manage permission — same visibility rule
 * ChatbotLead's own admin page already used. Returns the acting user's id
 * when known, for logActivity — requireChapterAccess() doesn't hand back a
 * session, same as updateVisitorStatus/updateVisitorNotes above it.
 */
async function authorizeLeadAccess(chapterId: string | null): Promise<string | undefined> {
  if (chapterId) {
    await requireChapterAccess(chapterId, "leads:manage");
    return undefined;
  }
  const session = await requirePermission("leads:manage");
  return session.user.id;
}

export async function setLeadStatus(leadId: string, status: $Enums.LeadStatus) {
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  const userId = await authorizeLeadAccess(lead.chapterId);

  await db.lead.update({ where: { id: leadId }, data: { status } });

  await logActivity({ userId, action: "lead.status_changed", entity: "Lead", entityId: leadId, metadata: { status } });

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

const notesSchema = z.object({ leadId: z.string(), notes: z.string().optional() });

export async function updateLeadNotes(_prevState: { error?: string } | undefined, formData: FormData) {
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const lead = await db.lead.findUniqueOrThrow({ where: { id: parsed.data.leadId } });
  const userId = await authorizeLeadAccess(lead.chapterId);

  await db.lead.update({ where: { id: parsed.data.leadId }, data: { notes: parsed.data.notes || null } });

  await logActivity({ userId, action: "lead.notes_updated", entity: "Lead", entityId: parsed.data.leadId });

  revalidatePath("/admin/leads");
  return { error: undefined };
}
