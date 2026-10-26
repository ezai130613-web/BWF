import { signOutEverywhere } from "@/lib/auth/sign-out-everywhere";
import { json, mobileHandler, requireMobileUser } from "@/lib/mobile/api";

/** "Sign out of all devices" — every phone and browser, including this one. */
export const POST = mobileHandler(async (request: Request) => {
  const { user } = await requireMobileUser(request);
  await signOutEverywhere(user.id);
  return json({ ok: true });
});
