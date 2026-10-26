"use server";

import { requireMemberSession } from "@/lib/auth/rbac";
import { signOutEverywhere } from "@/lib/auth/sign-out-everywhere";

/** Revokes every session for this member — including "keep me signed in"
 * devices and the mobile app — by bumping sessionVersion (checked on every
 * request in src/lib/auth/config.ts). The caller signs out locally afterwards. */
export async function signOutAllDevices() {
  const session = await requireMemberSession();
  await signOutEverywhere(session.user.id);
}
