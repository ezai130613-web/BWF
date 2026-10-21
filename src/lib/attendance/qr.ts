import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

/**
 * QR Code / Attendance / Payment system (2026-09-17). One secure token per
 * Meeting, generated once and persisted on Meeting.attendanceQrToken —
 * "reopening the meeting displays its existing QR rather than creating a new
 * one." base64url keeps the token safe to drop straight into a URL path with
 * no encoding.
 */
export function generateAttendanceToken(): string {
  return randomBytes(24).toString("base64url");
}

/** The URL the QR itself encodes — member portal check-in for one meeting. */
export function getCheckinUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/member/checkin/${token}`;
}

/** Visitor Management System (2026-09-18) — the public, signed-out counterpart of getCheckinUrl. */
export function getVisitorCheckinUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/visitor-checkin/${token}`;
}

/** PNG buffer for View/Download/Print — see /api/admin/qr-codes/[meetingId]. */
export async function renderQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", width: 480, margin: 2 });
}

/**
 * The optional check-in window set on the member QR page (admin/qr-codes/[meetingId]).
 * One window per meeting, applied to both member and visitor QR check-in.
 */
export function isWithinCheckinWindow(
  meeting: { checkInOpensAt: Date | null; checkInClosesAt: Date | null },
  now = new Date(),
): boolean {
  return (!meeting.checkInOpensAt || now >= meeting.checkInOpensAt) && (!meeting.checkInClosesAt || now <= meeting.checkInClosesAt);
}
