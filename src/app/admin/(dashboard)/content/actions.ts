"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

export async function updateWebsiteContent(key: string, formData: FormData) {
  const session = await requirePermission("content:manage");

  const value = formData.get("value");
  await db.websiteContent.update({
    where: { key },
    data: { value: typeof value === "string" && value.trim() ? value : null },
  });

  await logActivity({
    userId: session.user.id,
    action: "website_content.updated",
    entity: "WebsiteContent",
    entityId: key,
  });

  // Content blocks are scattered across whichever public pages read them —
  // simplest correct option is to revalidate broadly rather than track
  // which page(s) each key affects individually.
  revalidatePath("/", "layout");
}
