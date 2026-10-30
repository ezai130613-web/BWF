"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import type { ActivityType } from "@/generated/prisma/client";

export async function updatePointsConfig(activityType: ActivityType, formData: FormData) {
  const session = await requirePermission("points_config:manage");

  const parsed = z
    .object({ points: z.coerce.number().int().min(0), perUnit: z.coerce.number().int().min(1) })
    .safeParse({ points: formData.get("points"), perUnit: formData.get("perUnit") });
  if (!parsed.success) return;

  // Upsert: a type added after the seed (e.g. ATTENDANCE) may have no row yet.
  await db.pointsConfig.upsert({ where: { activityType }, update: parsed.data, create: { activityType, ...parsed.data } });

  await logActivity({
    userId: session.user.id,
    action: "points_config.updated",
    entity: "PointsConfig",
    entityId: activityType,
    metadata: parsed.data,
  });

  revalidatePath("/admin/points-config");
  revalidatePath("/member/points");
}
