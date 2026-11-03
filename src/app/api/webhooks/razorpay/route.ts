import { NextResponse } from "next/server";
import { finalizeRazorpayCheckout, verifyWebhookSignature } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook (2026-11-03) — the backstop for a member who pays but
 * closes the tab before being redirected back. Subscribe to
 * payment_link.paid, payment_link.expired and payment_link.cancelled, with
 * the secret in RAZORPAY_WEBHOOK_SECRET. Signed body is checked first; the
 * link's status is then re-read from Razorpay's API before anything is saved.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let event: { event?: string; payload?: { payment_link?: { entity?: { id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const linkId = event.payload?.payment_link?.entity?.id;
  if (event.event?.startsWith("payment_link.") && linkId) {
    // Errors propagate as 500 so Razorpay retries.
    await finalizeRazorpayCheckout(linkId);
  }
  return NextResponse.json({ ok: true });
}
