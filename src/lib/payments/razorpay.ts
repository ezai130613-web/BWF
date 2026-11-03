import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { istParts } from "@/lib/ist";
import { isMeetingPackage, parseFee, quoteMeetings, quoteMembershipFee } from "@/lib/payments/fees";
import { getMeetingPackages } from "@/lib/payments/packages";
import {
  dbDateKey,
  keyToDbDate,
  loadMemberForCoverage,
  monthsForMeetings,
  PACKAGE_ONLY_ERROR,
  monthsOfDates,
  nextUnpaidMeetingDays,
  overlapsApprovedDates,
} from "@/lib/payments/coverage";
import { hasApprovedMembership } from "@/lib/payments/member-payments";
import { Prisma } from "@/generated/prisma/client";
import { getBooleanSetting } from "@/lib/settings";
import { sendInvoice } from "@/lib/invoices";

/**
 * Razorpay online payments (2026-11-03, client request: "people directly
 * make payment in the Razorpay link instead of uploading proof").
 *
 * Uses Razorpay Payment Links (hosted page — works the same from the
 * website and the app, no checkout script). Flow:
 *   1. Member picks a meeting package (or the membership year) → createRazorpayCheckout()
 *      works out the meeting dates and amount on the server, creates a
 *      Payment Link and a RazorpayCheckout row, and returns the link URL.
 *   2. Member pays on Razorpay → is sent back to /api/payments/razorpay/return,
 *      and Razorpay also calls /api/webhooks/razorpay.
 *   3. Either one calls finalizeRazorpayCheckout(), which asks Razorpay's API
 *      for the link's real status (never trusting the redirect's query
 *      string) and, if paid, creates the APPROVED Payment exactly once.
 *
 * Switched off until RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set (and
 * RAZORPAY_WEBHOOK_SECRET for the webhook); until then members keep the
 * screenshot upload.
 */

const API = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

type RazorpayLink = {
  id: string;
  short_url: string;
  status: "created" | "partially_paid" | "paid" | "expired" | "cancelled";
  amount: number;
  amount_paid: number;
  reference_id?: string;
  payments: { payment_id: string; amount: number; status: string }[] | null;
};

async function razorpay<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error?.description ?? `Razorpay error ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export type CheckoutResult = { url: string; error?: undefined } | { url?: undefined; error: string };

/** Step 1 — create a Payment Link for a meeting package (`meetings` = 2, 6, 12 or 24 — nothing else) or a year's membership. */
export async function createRazorpayCheckout(
  memberId: string,
  request: { type: "MEETING"; meetings: number } | { type: "MEMBERSHIP"; membershipYear: number },
): Promise<CheckoutResult> {
  if (!isRazorpayConfigured()) return { error: "Online payment isn't available yet — please use the screenshot upload." };

  const member = await loadMemberForCoverage(memberId);
  const profile = await db.member.findUniqueOrThrow({ where: { id: memberId }, select: { name: true, email: true, phone: true } });
  const content = await getContent(["fees.annualMembership"]);

  let amountInr: number;
  let meetingDates: string[] = [];
  let numberOfMonths = 0;
  let membershipYear: number | null = null;
  let description: string;

  if (request.type === "MEETING") {
    const count = request.meetings;
    if (!isMeetingPackage(count)) return { error: PACKAGE_ONLY_ERROR };
    const days = await nextUnpaidMeetingDays(member, count);
    if (days.length < count) {
      return { error: `Only ${days.length} upcoming meetings are scheduled for your chapter — choose a smaller package or contact BWF.` };
    }
    amountInr = quoteMeetings(count, await getMeetingPackages())!.total;
    meetingDates = days.map((d) => d.date);
    numberOfMonths = monthsForMeetings(days.length, member.chapter);
    description = `BWF meeting fee — ${days.length} meeting(s), ${meetingDates[0]} to ${meetingDates[meetingDates.length - 1]}`;
  } else {
    const year = request.membershipYear;
    const thisYear = istParts(new Date()).year;
    if (!Number.isInteger(year) || year < thisYear - 1 || year > thisYear + 1) return { error: "Select the membership year." };
    const total = quoteMembershipFee(parseFee(content["fees.annualMembership"]));
    if (!total) return { error: "The annual membership fee hasn't been set by BWF yet." };
    amountInr = total;
    membershipYear = year;
    description = `BWF annual membership ${year}`;
  }

  // Our checkout id doubles as Razorpay's reference_id (max 40 chars).
  const id = randomUUID().replace(/-/g, "");
  const contact = profile.phone?.replace(/[^\d+]/g, "") ?? "";
  const link = await razorpay<RazorpayLink>("/payment_links", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: "INR",
      accept_partial: false,
      reference_id: id,
      description: description.slice(0, 2048),
      customer: {
        name: profile.name,
        ...(profile.email ? { email: profile.email } : {}),
        ...(contact.length >= 8 && contact.length <= 14 ? { contact } : {}),
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      // A day is plenty to finish paying; an expired link just means "start again".
      expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      callback_url: `${SITE_URL}/api/payments/razorpay/return`,
      callback_method: "get",
      notes: { memberId, type: request.type },
    }),
  });

  await db.razorpayCheckout.create({
    data: {
      id,
      memberId,
      type: request.type,
      membershipYear,
      meetingDates: meetingDates.map(keyToDbDate),
      numberOfMonths,
      amountInr: new Prisma.Decimal(amountInr),
      linkId: link.id,
      linkUrl: link.short_url,
    },
  });
  return { url: link.short_url };
}

export type FinalizeOutcome = "PAID" | "ALREADY_PAID" | "NOT_PAID" | "EXPIRED" | "UNKNOWN";

/**
 * Step 3 — idempotent: safe to call from both the browser return and the
 * webhook, any number of times. Only Razorpay's own API decides "paid".
 */
export async function finalizeRazorpayCheckout(linkId: string): Promise<FinalizeOutcome> {
  const checkout = await db.razorpayCheckout.findUnique({ where: { linkId } });
  if (!checkout) return "UNKNOWN";
  if (checkout.status === "PAID") return "ALREADY_PAID";

  const link = await razorpay<RazorpayLink>(`/payment_links/${encodeURIComponent(linkId)}`);
  if (link.status === "expired" || link.status === "cancelled") {
    await db.razorpayCheckout.updateMany({ where: { id: checkout.id, status: "CREATED" }, data: { status: link.status.toUpperCase() } });
    return "EXPIRED";
  }
  if (link.status !== "paid") return "NOT_PAID";

  const captured = link.payments?.find((p) => p.status === "captured") ?? link.payments?.[0];
  const dates = checkout.meetingDates.map(dbDateKey);
  const overlaps =
    checkout.type === "MEETING"
      ? await overlapsApprovedDates(checkout.memberId, dates)
      : await hasApprovedMembership(checkout.memberId, checkout.membershipYear ?? 0);

  const outcome = await db.$transaction(async (tx) => {
    // Claim the checkout — only one caller gets count === 1.
    const claimed = await tx.razorpayCheckout.updateMany({
      where: { id: checkout.id, status: { not: "PAID" } },
      data: { status: "PAID", razorpayPaymentId: captured?.payment_id ?? null },
    });
    if (claimed.count === 0) return "ALREADY_PAID" as const;
    const now = new Date();
    const payment = await tx.payment.create({
      data: {
        memberId: checkout.memberId,
        type: checkout.type,
        membershipYear: checkout.membershipYear,
        numberOfMonths: checkout.numberOfMonths,
        meetingDates: checkout.meetingDates,
        monthsCovered: checkout.type === "MEETING" ? monthsOfDates(dates) : [],
        amountPaidInr: new Prisma.Decimal(link.amount_paid / 100),
        expectedAmountInr: checkout.amountInr,
        actualPaymentDate: now,
        proofUrl: null,
        method: "RAZORPAY",
        razorpayPaymentId: captured?.payment_id ?? null,
        reference: captured?.payment_id ?? linkId,
        status: "APPROVED",
        reviewedAt: now,
        reviewRemarks: "Paid online via Razorpay — approved automatically.",
        overlapsApprovedCoverage: overlaps,
        idempotencyKey: `rzp:${linkId}`,
      },
    });
    await tx.razorpayCheckout.update({ where: { id: checkout.id }, data: { paymentId: payment.id } });
    return payment.id;
  });

  // Auto-invoice (setting off by default). Only the caller that created the
  // payment gets here, so the member is emailed once. A failed send never
  // fails the payment — the admin can still press "Send invoice".
  if (outcome !== "ALREADY_PAID" && (await getBooleanSetting("invoices.autoSendRazorpay"))) {
    const sent = await sendInvoice(outcome, "AUTO");
    if (!sent.ok) console.error(`[invoice] auto-send for payment ${outcome} failed: ${sent.error}`);
  }

  revalidatePath("/member/payments");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/members");
  revalidatePath("/admin/accounts");
  return outcome === "ALREADY_PAID" ? outcome : "PAID";
}

/** Webhook signature: HMAC-SHA256 of the raw body with the webhook secret, hex, in X-Razorpay-Signature. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
