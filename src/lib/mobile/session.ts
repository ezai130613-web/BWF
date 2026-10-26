import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Native app sign-in tokens (Phase 31). See the MobileSession model for the
 * revocation rules. The token is 32 random bytes; only its SHA-256 hash is
 * stored. A plain hash (not Argon2) is right here: the input is already
 * high-entropy, so there is nothing to brute-force, and it lets us look the
 * row up by its unique index on every request.
 */

/** Same ceiling as the web's "Keep me signed in" session. */
export const MOBILE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** lastUsedAt/expiresAt are refreshed at most this often, not on every request. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const TOKEN_PREFIX = "bwfm_";

export function hashMobileToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMobileSession(input: {
  userId: string;
  sessionVersion: number;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
}): Promise<{ token: string; sessionId: string }> {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const session = await db.mobileSession.create({
    data: {
      userId: input.userId,
      sessionVersion: input.sessionVersion,
      tokenHash: hashMobileToken(token),
      platform: input.platform?.slice(0, 20),
      deviceName: input.deviceName?.slice(0, 100),
      appVersion: input.appVersion?.slice(0, 20),
      expiresAt: new Date(Date.now() + MOBILE_SESSION_TTL_MS),
    },
  });
  return { token, sessionId: session.id };
}

/**
 * The live session + user behind a bearer token, or null when the token is
 * unknown, expired, revoked, or no longer matches the user's current
 * status/sessionVersion. Role checks are the caller's job.
 */
export async function findMobileSession(token: string) {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const session = await db.mobileSession.findUnique({
    where: { tokenHash: hashMobileToken(token) },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });
  if (!session) return null;

  const now = new Date();
  const { user } = session;
  if (session.revokedAt || session.expiresAt < now) return null;
  if (user.status !== "ACTIVE" || user.sessionVersion !== session.sessionVersion) return null;

  if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.mobileSession.update({
      where: { id: session.id },
      data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + MOBILE_SESSION_TTL_MS) },
    });
  }

  return { session, user, roleKeys: user.roles.map((r) => r.role.key) };
}

export async function revokeMobileSession(sessionId: string) {
  await db.mobileSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}
