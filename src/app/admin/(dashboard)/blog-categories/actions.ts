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

export async function createBlogCategory(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = slugify(parsed.data.name);
  const existing = await db.blogCategory.findUnique({ where: { slug } });
  if (existing) return { error: "A category with that name already exists." };

  const category = await db.blogCategory.create({
    data: { name: parsed.data.name, slug, description: parsed.data.description },
  });

  await logActivity({
    userId: session.user.id,
    action: "blog_category.created",
    entity: "BlogCategory",
    entityId: category.id,
  });

  revalidatePath("/admin/blog-categories");
  revalidatePath("/insights");
  return { error: undefined };
}
