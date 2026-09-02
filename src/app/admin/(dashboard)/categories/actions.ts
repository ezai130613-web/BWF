"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export async function createCategory(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("categories:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = slugify(parsed.data.name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return { error: "A category with that name already exists." };

  const category = await db.category.create({
    data: { name: parsed.data.name, slug, description: parsed.data.description },
  });

  await logActivity({
    userId: session.user.id,
    action: "category.created",
    entity: "Category",
    entityId: category.id,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/chapters/[slug]", "page");
  return { error: undefined };
}

export async function toggleCategoryActive(categoryId: string) {
  const session = await requirePermission("categories:manage");

  const category = await db.category.findUniqueOrThrow({ where: { id: categoryId } });
  await db.category.update({ where: { id: categoryId }, data: { isActive: !category.isActive } });

  await logActivity({
    userId: session.user.id,
    action: category.isActive ? "category.deactivated" : "category.activated",
    entity: "Category",
    entityId: categoryId,
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/chapters/[slug]", "page");
}
