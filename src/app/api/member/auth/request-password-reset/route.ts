import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/password-reset";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";

const bodySchema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // Always the same response — requestPasswordReset() never reveals
  // whether the account exists (see its own doc comment).
  await requestPasswordReset(parsed.data.email, MEMBER_ROLE_KEYS);
  return NextResponse.json({ ok: true });
}
