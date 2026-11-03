import { NextResponse } from "next/server";
import { finalizeRazorpayCheckout, isRazorpayConfigured } from "@/lib/payments/razorpay";
import { SITE_URL } from "@/lib/site";

/**
 * Where Razorpay sends the member's browser after paying (2026-11-03). The
 * query string is only used to know WHICH link — whether it's paid is asked
 * of Razorpay's API inside finalizeRazorpayCheckout(), so a hand-crafted URL
 * can't mark anything paid. Works for the app too (it opens the link in a
 * browser and lands here).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkId = url.searchParams.get("razorpay_payment_link_id");
  const back = new URL("/member/payments", SITE_URL);

  if (!isRazorpayConfigured() || !linkId || !/^plink_[A-Za-z0-9]+$/.test(linkId)) {
    back.searchParams.set("online", "error");
    return NextResponse.redirect(back);
  }
  try {
    const outcome = await finalizeRazorpayCheckout(linkId);
    back.searchParams.set("online", outcome === "PAID" || outcome === "ALREADY_PAID" ? "paid" : outcome === "EXPIRED" ? "expired" : "pending");
  } catch (err) {
    console.error("razorpay return", err);
    // The webhook will still confirm it; tell the member to refresh shortly.
    back.searchParams.set("online", "pending");
  }
  return NextResponse.redirect(back);
}
