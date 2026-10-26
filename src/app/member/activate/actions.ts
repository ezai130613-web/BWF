"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { completeActivationForUser, sendActivationCodeForUser, type ActivationInput } from "@/lib/auth/activation";

/** Web first sign-in (/member/activate and /admin/activate) — the logic lives in src/lib/auth/activation.ts. */
async function requirePendingActivation() {
  const session = await auth();
  if (!session?.user) redirect("/member/login");
  return db.user.findUniqueOrThrow({ where: { id: session.user.id } });
}

export async function sendActivationCode(rawEmail: string): Promise<{ error?: string; sent?: boolean }> {
  return sendActivationCodeForUser(await requirePendingActivation(), rawEmail);
}

export async function completeActivation(input: ActivationInput): Promise<{ error?: string; ok?: boolean }> {
  return completeActivationForUser(await requirePendingActivation(), input);
}
