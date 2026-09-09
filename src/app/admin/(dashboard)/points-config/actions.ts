"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import type { ActivityType } from "@/generated/prisma/client";

export async function updatePointsConfig(activityType: ActivityType, formData: FormData) {
  const session = await requirePermission("points_config:manage");

  const parsed = z.coerce.number().int().min(0).safeParse(formData.get("points"));
  if (!parsed.success) return;

  await db.pointsConfig.update({ where: { activityType }, data: { points: parsed.data } });

  await logActivity({
    userId: session.user.id,
    action: "points_config.updated",
    entity: "PointsConfig",
    entityId: activityType,
    metadata: { points: parsed.data },
  });

  revalidatePath("/admin/points-config");
  revalidatePath("/member/points");
}
