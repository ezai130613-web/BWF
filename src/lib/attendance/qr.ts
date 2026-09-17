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

/** PNG buffer for View/Download/Print — see /api/admin/qr-codes/[meetingId]. */
export async function renderQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", width: 480, margin: 2 });
}
