import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

/**
 * "Sign out of all devices" — web sessions (any JWT carrying the old
 * sessionVersion) and phone sessions (MobileSession rows) alike. The
 * version bump alone already invalidates both, since findMobileSession()
 * compares versions; marking the rows revoked as well keeps the table
 * honest about which devices are still signed in.
 */
export async function signOutEverywhere(userId: string) {
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
    db.mobileSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await logActivity({ userId, action: "user.signed_out_everywhere" });
}
