import { NextResponse } from "next/server";
import { reconcileRazorpayCheckouts } from "@/lib/payments/razorpay";

// Every 10 minutes (vercel.json): records Razorpay payments the browser
// return / webhook missed. Same CRON_SECRET guard as the other crons.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await reconcileRazorpayCheckouts());
}
