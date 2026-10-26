import { db } from "@/lib/db";
import { isWithinCheckinWindow } from "@/lib/attendance/qr";
import { formatMonthYear } from "@/lib/attendance/manage";
import { checkInMember } from "@/lib/attendance/checkin";
import { fieldsFromJson, getMonthCoverage, meetingMonth } from "@/lib/payments/member-payments";
import { isOwnStorageUrl } from "@/lib/storage";
import { invalid, json, MobileApiError, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { CheckinPreviewResponse } from "@/lib/mobile/contract";

type Ctx = { params: Promise<{ token: string }> };

const notFound = () => new MobileApiError(404, "NOT_FOUND", "This check-in QR code isn't valid.");

/** What the scanned meeting QR is for — shown before the member confirms (same data as /member/checkin/[token]). */
export const GET = mobileHandler(async (request: Request, { params }: Ctx) => {
  const { token } = await params;
  const { member } = await requireMobileMember(request);

  const meeting = await db.meeting.findUnique({ where: { attendanceQrToken: token }, include: { chapter: true } });
  if (!meeting) throw notFound();

  const [me, existing] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: member.id }, include: { category: true, chapter: true } }),
    db.attendance.findUnique({ where: { meetingId_memberId: { meetingId: meeting.id, memberId: member.id } } }),
  ]);
  const month = meetingMonth(meeting.startsAt);

  const body: CheckinPreviewResponse = {
    meeting: { id: meeting.id, title: meeting.title, chapter: meeting.chapter.name, startsAt: meeting.startsAt.toISOString() },
    member: { name: me.name, category: me.category.name, chapter: me.chapter.name },
    open: meeting.attendanceRegistrationOpen && isWithinCheckinWindow(meeting),
    alreadyCheckedIn: existing?.status === "PRESENT",
    monthCoverage: await getMonthCoverage(member.id, month),
    monthLabel: formatMonthYear(month),
  };
  return json(body);
});

/** Marks the member present; optionally records a meeting payment in the same transaction. */
export const POST = mobileHandler(async (request: Request, { params }: Ctx) => {
  const { token } = await params;
  const { member } = await requireMobileMember(request);
  const body = await request.json().catch(() => null);
  const fields = fieldsFromJson(body);

  const proofUrl = fields.get("proofUrl");
  if (fields.get("madePayment") === "yes" && typeof proofUrl === "string" && proofUrl && !isOwnStorageUrl(proofUrl, "paymentProof")) {
    throw invalid("Upload the payment proof from the app.");
  }

  const result = await checkInMember(member.id, token, fields);
  if (result.error) throw invalid(result.error);
  return json({ ok: true });
});
