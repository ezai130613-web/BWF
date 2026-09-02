"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, requireRecentAuth } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

export async function toggleRolePermission(roleId: string, permissionId: string) {
  const session = await requirePermission("roles:manage");
  requireRecentAuth(session); // changing what a role can do is high-risk (brief §56)

  const role = await db.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.key === "SUPER_ADMIN") {
    // Super Admin's permission set is fixed on purpose — editable via the UI
    // it could accidentally lock every admin (including whoever's doing the
    // editing) out of the system entirely.
    throw new Error("Super Admin permissions cannot be edited.");
  }

  const existing = await db.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });

  if (existing) {
    await db.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
  } else {
    await db.rolePermission.create({ data: { roleId, permissionId } });
  }

  await logActivity({
    userId: session.user.id,
    action: existing ? "role.permission_revoked" : "role.permission_granted",
    entity: "Role",
    entityId: roleId,
    metadata: { permissionId },
  });

  revalidatePath("/admin/roles");
}
