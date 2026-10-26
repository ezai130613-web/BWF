import { revokeMobileSession } from "@/lib/mobile/session";
import { json, mobileHandler, requireMobileUser } from "@/lib/mobile/api";

/** Signs this phone out (only this device's session). */
export const POST = mobileHandler(async (request: Request) => {
  const { session } = await requireMobileUser(request, { allowPendingActivation: true });
  await revokeMobileSession(session.id);
  return json({ ok: true });
});
