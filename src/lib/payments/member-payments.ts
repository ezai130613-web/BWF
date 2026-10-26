import { db } from "@/lib/db";
import { istParts } from "@/lib/ist";
import { parseMonthsCovered, type MonthYear } from "@/lib/attendance/manage";

/**
 * Member payments (2026-10-21) — shared by QR check-in and the member
 * portal's Payments page, so both validate a submission the same way.
 */

export type ProofFields = { amountPaidInr: string; actualPaymentDate: Date; proofUrl: string };
export type MeetingPaymentFields = ProofFields & { numberOfMonths: number; monthsCovered: MonthYear[] };

type Parsed<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/** FormData on the web; fieldsFromJson() wraps the mobile app's JSON body in the same shape. */
export type PaymentFieldSource = { get(name: string): FormDataEntryValue | null };

/** Adapts a JSON object to PaymentFieldSource: strings and numbers pass through as strings, anything else is "missing". */
export function fieldsFromJson(body: unknown): PaymentFieldSource {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    get(name) {
      const value = obj[name];
      return typeof value === "string" ? value : typeof value === "number" ? String(value) : null;
    },
  };
}

export function parseProofFields(formData: PaymentFieldSource): Parsed<ProofFields> {
  const amountPaidInr = formData.get("amountPaidInr");
  const actualPaymentDateRaw = formData.get("actualPaymentDate");
  const proofUrl = formData.get("proofUrl");

  if (typeof amountPaidInr !== "string" || !amountPaidInr || !(Number(amountPaidInr) > 0)) {
    return { error: "Enter a valid amount paid." };
  }
  if (typeof actualPaymentDateRaw !== "string" || !actualPaymentDateRaw || Number.isNaN(new Date(actualPaymentDateRaw).getTime())) {
    return { error: "Enter the date the payment was made." };
  }
  if (typeof proofUrl !== "string" || !proofUrl) {
    return { error: "Upload payment proof (screenshot, receipt, or PDF)." };
  }
  return { data: { amountPaidInr, actualPaymentDate: new Date(actualPaymentDateRaw), proofUrl } };
}

/** numberOfMonths + month_i/year_i pairs + the proof fields. */
export function parseMeetingPaymentFields(formData: PaymentFieldSource): Parsed<MeetingPaymentFields> {
  const numberOfMonths = Number(formData.get("numberOfMonths"));
  if (!Number.isInteger(numberOfMonths) || numberOfMonths < 1 || numberOfMonths > 24) {
    return { error: "Select the number of months." };
  }

  const monthsCovered: MonthYear[] = [];
  for (let i = 0; i < numberOfMonths; i++) {
    const month = Number(formData.get(`month_${i}`));
    const year = Number(formData.get(`year_${i}`));
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
      return { error: "Select the month and year for every month covered." };
    }
    monthsCovered.push({ month, year });
  }

  const proof = parseProofFields(formData);
  if (proof.error !== undefined) return { error: proof.error };
  return { data: { numberOfMonths, monthsCovered, ...proof.data } };
}

/** The IST calendar month (1-based) a meeting falls in. */
export function meetingMonth(startsAt: Date): MonthYear {
  const { year, month } = istParts(startsAt);
  return { month: month + 1, year };
}

export type CoverageStatus = "APPROVED" | "PENDING" | null;

/**
 * Whether a member's meeting payments already cover a month. APPROVED wins
 * over PENDING; rejected submissions never count. Membership (annual)
 * payments are a separate fee and never cover a meeting month.
 */
export async function getMonthCoverage(memberId: string, month: MonthYear): Promise<CoverageStatus> {
  const payments = await db.payment.findMany({
    where: { memberId, type: "MEETING", status: { in: ["APPROVED", "PENDING_APPROVAL", "CLARIFICATION_REQUESTED"] } },
    select: { status: true, monthsCovered: true },
  });
  let status: CoverageStatus = null;
  for (const p of payments) {
    if (!parseMonthsCovered(p.monthsCovered).some((m) => m.month === month.month && m.year === month.year)) continue;
    if (p.status === "APPROVED") return "APPROVED";
    status = "PENDING";
  }
  return status;
}

/** Spec-style overlap flag for an annual payment: an APPROVED membership payment already exists for that year. */
export async function hasApprovedMembership(memberId: string, membershipYear: number): Promise<boolean> {
  const count = await db.payment.count({ where: { memberId, type: "MEMBERSHIP", membershipYear, status: "APPROVED" } });
  return count > 0;
}
