import type { z } from "zod";
import { db } from "@/lib/db";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";
import { findMobileSession } from "@/lib/mobile/session";

/**
 * Shared plumbing for /api/mobile/v1/** (Phase 31). Every handler is wrapped
 * in mobileHandler(), so a thrown MobileApiError becomes a JSON error with a
 * stable `code` the app can branch on, and anything unexpected becomes a
 * generic 500 — never a stack trace (same rule as the rest of the API).
 */

export type MobileErrorCode =
  | "UNAUTHENTICATED"
  | "ACTIVATION_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "LOCKED"
  | "UNAVAILABLE"
  | "SERVER_ERROR";

export class MobileApiError extends Error {
  constructor(
    public status: number,
    public code: MobileErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const unauthenticated = () => new MobileApiError(401, "UNAUTHENTICATED", "Please sign in again.");
export const invalid = (message: string) => new MobileApiError(400, "VALIDATION", message);

export function json(data: unknown, status = 200) {
  // Member data is private and per-user — never let a proxy or the app's
  // HTTP layer cache it.
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function mobileHandler<Ctx>(fn: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx) => {
    try {
      return await fn(request, ctx);
    } catch (error) {
      if (error instanceof MobileApiError) return json({ error: error.message, code: error.code }, error.status);
      console.error("Mobile API error:", error);
      return json({ error: "Something went wrong. Please try again.", code: "SERVER_ERROR" }, 500);
    }
  };
}

/** Parses a JSON body against `schema`; the first issue becomes the error message. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw invalid(parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * A signed-in member login. `allowPendingActivation` is only for the
 * first-login activation endpoints themselves — everything else answers
 * ACTIVATION_REQUIRED, mirroring requireMemberProfile()'s redirect.
 */
export async function requireMobileUser(request: Request, options: { allowPendingActivation?: boolean } = {}) {
  const token = bearerToken(request);
  if (!token) throw unauthenticated();

  const found = await findMobileSession(token);
  // Same rule as requireMemberSession(): a session existing isn't enough,
  // it must be a member login.
  if (!found || !found.roleKeys.some((key) => MEMBER_ROLE_KEYS.includes(key))) throw unauthenticated();

  if (found.user.mustChangePassword && !options.allowPendingActivation) {
    throw new MobileApiError(403, "ACTIVATION_REQUIRED", "Finish setting up your account first.");
  }
  return found;
}

/** requireMobileUser() plus the linked Member row — what nearly every endpoint needs. */
export async function requireMobileMember(request: Request) {
  const found = await requireMobileUser(request);
  const member = await db.member.findUnique({ where: { userId: found.user.id } });
  // Login exists but its Member link was removed — treat as signed out,
  // same as requireMemberProfile().
  if (!member) throw unauthenticated();
  return { ...found, member };
}
