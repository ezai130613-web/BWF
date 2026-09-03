import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Complements requestPasswordReset()'s own 60s per-user cooldown, which
  // doesn't cover one IP targeting many different emails.
  const ip = await getClientIp();
  const allowed = await rateLimit(`pwreset:${ip}:${parsed.data.email.toLowerCase()}`, { limit: 5, windowSeconds: 900 });
  if (!allowed) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS_ERROR }, { status: 429 });
  }

  // Always the same response — requestPasswordReset() never reveals
  // whether the account exists (see its own doc comment).
  await requestPasswordReset(parsed.data.email, MEMBER_ROLE_KEYS);
  return NextResponse.json({ ok: true });
}
