import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Phase 14 (brief §55 — "Rate limiting", "Form abuse protection"). Postgres-
 * backed rather than a new external service (Upstash/Redis would need real
 * credentials this project doesn't have) — a coarse abuse guard, not a
 * precise billing system, so a non-atomic read-then-write against one row
 * per key is an accepted simplification at this traffic scale. No automatic
 * cleanup of expired rows either — a private, chapter-based community site
 * isn't going to accumulate enough of them to matter; revisit if that ever
 * stops being true.
 */
export async function rateLimit(key: string, options: { limit: number; windowSeconds: number }): Promise<boolean> {
  const now = new Date();

  const existing = await db.rateLimitHit.findUnique({ where: { key } });

  if (!existing || existing.expiresAt < now) {
    await db.rateLimitHit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(now.getTime() + options.windowSeconds * 1000) },
      update: { count: 1, expiresAt: new Date(now.getTime() + options.windowSeconds * 1000) },
    });
    return true;
  }

  if (existing.count >= options.limit) {
    return false;
  }

  await db.rateLimitHit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}

/** Vercel sets x-forwarded-for for real; local/direct connections fall back
 * to one shared bucket, which is fine — it just means local dev traffic
 * rate-limits itself as one client, never a production concern. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export const TOO_MANY_REQUESTS_ERROR = "Too many requests — please try again later.";
