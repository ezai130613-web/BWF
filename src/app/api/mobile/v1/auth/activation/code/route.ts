import { z } from "zod";
import { sendActivationCodeForUser } from "@/lib/auth/activation";
import { invalid, json, mobileHandler, readJson, requireMobileUser } from "@/lib/mobile/api";

const bodySchema = z.object({ email: z.string().max(254) });

/** First sign-in: email a 6-digit code to the address the member wants to use. */
export const POST = mobileHandler(async (request: Request) => {
  const { user } = await requireMobileUser(request, { allowPendingActivation: true });
  const { email } = await readJson(request, bodySchema);
  const result = await sendActivationCodeForUser(user, email);
  if (result.error) throw invalid(result.error);
  return json({ sent: true });
});
