"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().optional(),
  description: z.string().optional(),
});

export async function createCompany(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("companies:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const company = await db.company.create({ data: parsed.data });

  await logActivity({
    userId: session.user.id,
    action: "company.created",
    entity: "Company",
    entityId: company.id,
  });

  revalidatePath("/admin/companies");
  return { error: undefined };
}
