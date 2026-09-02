"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

function revalidateFaqPaths() {
  revalidatePath("/admin/faqs");
  revalidatePath("/faqs");
}

const createSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

export async function createFaq(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("content:manage");

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const count = await db.siteFaq.count();
  const faq = await db.siteFaq.create({ data: { ...parsed.data, order: count } });

  await logActivity({ userId: session.user.id, action: "faq.created", entity: "SiteFaq", entityId: faq.id });

  revalidateFaqPaths();
  return { error: undefined };
}

export async function toggleFaqActive(faqId: string) {
  const session = await requirePermission("content:manage");

  const faq = await db.siteFaq.findUniqueOrThrow({ where: { id: faqId } });
  await db.siteFaq.update({ where: { id: faqId }, data: { isActive: !faq.isActive } });

  await logActivity({ userId: session.user.id, action: "faq.toggled", entity: "SiteFaq", entityId: faqId });

  revalidateFaqPaths();
}
