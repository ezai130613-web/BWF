"use server";

import { requireMemberProfile } from "@/lib/auth/rbac";
import { submitMemberPaymentFor, type MemberPaymentState } from "@/lib/payments/submit";
import { createRazorpayCheckout } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/rate-limit";

export type { MemberPaymentState };

/** See src/lib/payments/submit.ts. */
export async function submitMemberPayment(
  type: "MEETING" | "MEMBERSHIP",
  _prevState: MemberPaymentState | undefined,
  formData: FormData,
): Promise<MemberPaymentState> {
  const { member } = await requireMemberProfile();
  return submitMemberPaymentFor(member.id, type, formData);
}

export type OnlinePaymentState = { error?: string; url?: string };

/** 2026-11-03 — starts a Razorpay payment; the client then sends the browser to the returned link. */
export async function startOnlinePayment(
  type: "MEETING" | "MEMBERSHIP",
  _prevState: OnlinePaymentState | undefined,
  formData: FormData,
): Promise<OnlinePaymentState> {
  const { member } = await requireMemberProfile();
  if (!(await rateLimit(`razorpay-link:${member.id}`, { limit: 20, windowSeconds: 3600 }))) {
    return { error: "Too many attempts — please try again in a little while." };
  }
  try {
    const result =
      type === "MEETING"
        ? await createRazorpayCheckout(member.id, { type, meetings: Number(formData.get("meetingsToPay")) })
        : await createRazorpayCheckout(member.id, { type, membershipYear: Number(formData.get("membershipYear")) });
    return result.error ? { error: result.error } : { url: result.url };
  } catch (err) {
    console.error("razorpay checkout", err);
    return { error: "Couldn't start the online payment — please try again." };
  }
}
