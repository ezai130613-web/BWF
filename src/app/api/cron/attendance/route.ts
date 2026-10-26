import { NextResponse } from "next/server";
import { processAbsences } from "@/lib/attendance/absences";

// Phase 39 — hourly (vercel.json): auto-close finished meetings' attendance,
// then send 2-in-a-row warnings and open 3-in-a-row admin reviews. Same
// CRON_SECRET guard as /api/cron/meeting-reminders.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await processAbsences();
  return NextResponse.json(summary);
}
