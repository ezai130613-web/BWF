import { z } from "zod";
import { createRazorpayCheckout } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/rate-limit";
import { invalid, json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { OnlinePaymentResponse } from "@/lib/mobile/contract";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MEETING"), monthsToPay: z.coerce.number().int().min(1).max(12) }),
  z.object({ type: z.literal("MEMBERSHIP"), membershipYear: z.coerce.number().int() }),
]);

/**
 * 2026-11-03 — starts a Razorpay payment for the app. Body: { type: "MEETING",
 * monthsToPay } or { type: "MEMBERSHIP", membershipYear }. The app opens the
 * returned URL in a browser; Razorpay confirms it to the server directly.
 */
export const POST = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw invalid("Choose what to pay for.");
  if (!(await rateLimit(`razorpay-link:${member.id}`, { limit: 20, windowSeconds: 3600 }))) {
    throw invalid("Too many attempts — please try again in a little while.");
  }
  const body = parsed.data;
  const result =
    body.type === "MEETING"
      ? await createRazorpayCheckout(member.id, { type: "MEETING", months: body.monthsToPay })
      : await createRazorpayCheckout(member.id, { type: "MEMBERSHIP", membershipYear: body.membershipYear });
  if (result.error !== undefined) throw invalid(result.error);
  const response: OnlinePaymentResponse = { url: result.url };
  return json(response, 201);
});
