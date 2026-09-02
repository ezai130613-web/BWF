import { db } from "@/lib/db";

export async function logActivity(input: {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      // Round-trip through JSON so this satisfies Prisma's strict
      // InputJsonValue type without a fragile hand-written cast.
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
    },
  });
}
