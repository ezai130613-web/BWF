"use server";

import { db } from "@/lib/db";
import { requireMemberSession } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";

/** Revokes every session for this member — including "keep me signed in"
 * devices — by bumping sessionVersion (checked on every request in
 * src/lib/auth/config.ts). The caller signs out locally afterwards. */
export async function signOutAllDevices() {
  const session = await requireMemberSession();
  await db.user.update({ where: { id: session.user.id }, data: { sessionVersion: { increment: 1 } } });
  await logActivity({ userId: session.user.id, action: "user.signed_out_everywhere" });
}
