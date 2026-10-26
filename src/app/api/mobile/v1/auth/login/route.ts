import { z } from "zod";
import { db } from "@/lib/db";
import { AccountLockedError, authorizeLogin } from "@/lib/auth/login";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";
import { getClientIp, rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { createMobileSession } from "@/lib/mobile/session";
import { getMobileAccount } from "@/lib/mobile/account";
import { json, MobileApiError, mobileHandler, readJson } from "@/lib/mobile/api";

const bodySchema = z.object({
  identifier: z.string("Enter your username or email.").trim().min(1, "Enter your username or email.").max(254),
  password: z.string("Enter your password.").min(1, "Enter your password.").max(200),
  platform: z.string().max(20).optional(),
  deviceName: z.string().max(100).optional(),
  appVersion: z.string().max(20).optional(),
});

/**
 * Member sign-in from the app (Phase 31). Same authorizeLogin() as the web
 * member login — lockout after 5 failures, generic error, MEMBER role only,
 * username or email — then a MobileSession instead of a cookie.
 */
export const POST = mobileHandler(async (request: Request) => {
  const body = await readJson(request, bodySchema);

  // authorizeLogin()'s per-account lockout doesn't stop one client trying
  // many accounts (temporary passwords are word + 4 digits).
  const ip = await getClientIp();
  if (!(await rateLimit(`mobile-login:${ip}`, { limit: 30, windowSeconds: 900 }))) {
    throw new MobileApiError(429, "RATE_LIMITED", TOO_MANY_REQUESTS_ERROR);
  }

  let result;
  try {
    result = await authorizeLogin(body.identifier, body.password, MEMBER_ROLE_KEYS, { allowUsername: true });
  } catch (error) {
    if (error instanceof AccountLockedError) throw new MobileApiError(423, "LOCKED", "Too many failed attempts. Try again later.");
    throw error;
  }
  if (!result) throw new MobileApiError(401, "UNAUTHENTICATED", "Invalid username/email or password.");

  const { token } = await createMobileSession({
    userId: result.id,
    sessionVersion: result.sessionVersion,
    platform: body.platform,
    deviceName: body.deviceName,
    appVersion: body.appVersion,
  });

  const user = await db.user.findUniqueOrThrow({ where: { id: result.id } });
  return json({ token, account: await getMobileAccount(user) });
});
