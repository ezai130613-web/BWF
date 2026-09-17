import { NextResponse } from "next/server";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getCheckinUrl, renderQrPng } from "@/lib/attendance/qr";

/** Streams the meeting's registration QR as a PNG — used for View/Download/Print on /admin/qr-codes/[meetingId]. */
export async function GET(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const { searchParams } = new URL(request.url);

  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting?.attendanceQrToken) {
    return NextResponse.json({ error: "QR not generated for this meeting yet." }, { status: 404 });
  }

  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  const png = await renderQrPng(getCheckinUrl(meeting.attendanceQrToken));
  const headers: Record<string, string> = { "Content-Type": "image/png" };
  if (searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="${meeting.title.replace(/[^a-z0-9]+/gi, "-")}-qr.png"`;
  }

  return new NextResponse(new Uint8Array(png), { headers });
}
