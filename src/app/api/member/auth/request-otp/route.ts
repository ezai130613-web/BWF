import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/lib/auth/otp-login";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const ip = await getClientIp();
  const allowed = await rateLimit(`otp:${ip}:${parsed.data.email.toLowerCase()}`, { limit: 5, windowSeconds: 900 });
  if (!allowed) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS_ERROR }, { status: 429 });
  }

  const result = await requestOtp(parsed.data.email, parsed.data.password, MEMBER_ROLE_KEYS);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ challengeId: result.challengeId });
}
