"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const optionalText = () => z.string().optional().transform((v) => v || undefined);

const recordSchema = z.object({
  name: z.string().min(1, "Enter the consumer's name"),
  company: optionalText(),
  phone: optionalText(),
  notes: optionalText(),
});

/**
 * Phase 20 Batch 5 — a member self-reports bringing an end consumer (real
 * construction requirement, not a prospective member) to a meeting. Same
 * shape/pattern as recordPowerDate — no link to the public Visitor model,
 * the consumer never needs to have gone through the /visit registration
 * flow at all.
 */
export async function recordConsumer(_prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const { session, member } = await requireMemberProfile();

  const parsed = recordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };

  const consumer = await db.consumer.create({
    data: { ...parsed.data, memberId: member.id },
  });

  await logActivity({
    userId: session.user.id,
    action: "consumer.recorded",
    entity: "Consumer",
    entityId: consumer.id,
    metadata: { memberId: member.id },
  });

  revalidatePath("/member/consumers");
  return { error: undefined, success: true };
}
