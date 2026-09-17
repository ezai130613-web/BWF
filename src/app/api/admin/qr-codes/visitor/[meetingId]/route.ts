import { NextResponse } from "next/server";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getVisitorCheckinUrl, renderQrPng } from "@/lib/attendance/qr";

/** Streams the meeting's visitor check-in QR as a PNG — used for View/Download/Print on /admin/visitors-qr/[meetingId]. */
export async function GET(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const { searchParams } = new URL(request.url);

  const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting?.visitorAttendanceQrToken) {
    return NextResponse.json({ error: "Visitor QR not generated for this meeting yet." }, { status: 404 });
  }

  await requireChapterAccess(meeting.chapterId, "attendance:manage");

  const png = await renderQrPng(getVisitorCheckinUrl(meeting.visitorAttendanceQrToken));
  const headers: Record<string, string> = { "Content-Type": "image/png" };
  if (searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="${meeting.title.replace(/[^a-z0-9]+/gi, "-")}-visitor-qr.png"`;
  }

  return new NextResponse(new Uint8Array(png), { headers });
}
