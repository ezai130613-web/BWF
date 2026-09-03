import { NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/lib/auth/password-reset";
import { newPasswordSchema } from "@/lib/auth/password";
import { MEMBER_ROLE_KEYS } from "@/lib/auth/constants";

const bodySchema = z.object({
  email: z.email(),
  code: z.string().min(1),
  password: newPasswordSchema,
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const result = await resetPassword(parsed.data.email, parsed.data.code, parsed.data.password, MEMBER_ROLE_KEYS);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
