import { getMobileAccount } from "@/lib/mobile/account";
import { json, mobileHandler, requireMobileUser } from "@/lib/mobile/api";

/** Who is signed in, and whether first-login activation is still pending. */
export const GET = mobileHandler(async (request: Request) => {
  const { user } = await requireMobileUser(request, { allowPendingActivation: true });
  return json({ account: await getMobileAccount(user) });
});
