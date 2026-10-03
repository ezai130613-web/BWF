import { NextResponse } from "next/server";
import { processDueMeetingReminders } from "@/lib/meetings/reminders";

// Hourly (vercel.json). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`;
// anything else is rejected, and nothing runs at all if the secret isn't set.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processDueMeetingReminders();
  return NextResponse.json({ processed });
}
