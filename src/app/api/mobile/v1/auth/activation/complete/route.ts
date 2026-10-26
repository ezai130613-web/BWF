import { z } from "zod";
import { db } from "@/lib/db";
import { completeActivationForUser } from "@/lib/auth/activation";
import { createMobileSession, revokeMobileSession } from "@/lib/mobile/session";
import { getMobileAccount } from "@/lib/mobile/account";
import { invalid, json, mobileHandler, readJson, requireMobileUser } from "@/lib/mobile/api";

const bodySchema = z.object({
  username: z.string().max(60).optional(),
  email: z.string().max(254),
  code: z.string().max(12).optional(),
  password: z.string().max(200),
  confirmPassword: z.string().max(200),
});

/**
 * First sign-in: verify email + set a private password (and username, for
 * BWFCC### logins). Completing it bumps sessionVersion, which ends every
 * session opened with the temporary password — including this phone's — so
 * the response carries a fresh token for the app to swap in.
 */
export const POST = mobileHandler(async (request: Request) => {
  const { user, session } = await requireMobileUser(request, { allowPendingActivation: true });
  const body = await readJson(request, bodySchema);

  const result = await completeActivationForUser(user, body);
  if (result.error) throw invalid(result.error);

  await revokeMobileSession(session.id);
  const activated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const { token } = await createMobileSession({
    userId: activated.id,
    sessionVersion: activated.sessionVersion,
    platform: session.platform ?? undefined,
    deviceName: session.deviceName ?? undefined,
    appVersion: session.appVersion ?? undefined,
  });
  return json({ token, account: await getMobileAccount(activated) });
});
