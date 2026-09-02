import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { generateOtpCode, hashOtpCode, otpExpiryDate } from "@/lib/auth/otp";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";

const ADMIN_ROLE_KEYS = ["SUPER_ADMIN", "CENTRAL_ADMIN"];
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Deliberately generic — never reveal whether the email exists, whether the
// password was wrong, or whether the account is locked. All of those are
// user-enumeration or timing signals otherwise.
const GENERIC_ERROR = "Invalid email or password.";

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  // Constant-shape response whether or not the user exists, so this branch
  // doesn't leak account existence via timing/response differences beyond
  // what an unavoidable DB round-trip already costs.
  if (!user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429 },
    );
  }

  const roleKeys = user.roles.map((r) => r.role.key);
  const isAdmin = roleKeys.some((key) => ADMIN_ROLE_KEYS.includes(key));

  const passwordValid = user.status === "ACTIVE" && isAdmin && (await verifyPassword(user.password, parsed.data.password));

  if (!passwordValid) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount, lockedUntil },
    });
    await logActivity({ userId: user.id, action: "user.login_failed" });

    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const code = generateOtpCode();
  const challenge = await db.otpChallenge.create({
    data: {
      userId: user.id,
      codeHash: hashOtpCode(code),
      expiresAt: otpExpiryDate(),
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Your Builders World Forum admin login code",
    text: `Your login code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });

  await logActivity({ userId: user.id, action: "user.otp_requested" });

  return NextResponse.json({ challengeId: challenge.id });
}
