"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { slugify } from "@/lib/slugify";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  memberId: z.string().optional(),
});

export async function createAuthor(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("blogs:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    bio: formData.get("bio") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    memberId: formData.get("memberId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const baseSlug = slugify(parsed.data.name) || "author";
  let slug = baseSlug;
  let suffix = 2;
  while (await db.author.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  if (parsed.data.memberId) {
    const existing = await db.author.findUnique({ where: { memberId: parsed.data.memberId } });
    if (existing) return { error: "That member already has an author profile." };
  }

  const author = await db.author.create({
    data: { ...parsed.data, slug },
  });

  await logActivity({
    userId: session.user.id,
    action: "author.created",
    entity: "Author",
    entityId: author.id,
  });

  revalidatePath("/admin/authors");
  return { error: undefined };
}
