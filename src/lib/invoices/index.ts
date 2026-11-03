import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { isEmailProviderConfigured, sendEmail } from "@/lib/email";
import { istParts } from "@/lib/ist";
import { MEETING_FEE_GST_PERCENT } from "@/lib/payments/fees";
import { PAYMENT_METHOD_LABELS, formatMeetingDates } from "@/lib/payments/dates";
import { Prisma } from "@/generated/prisma/client";
import { generateInvoicePdf } from "./pdf";

/**
 * Member payment invoices (2026-11-03).
 *
 * - Only APPROVED member payments get an invoice.
 * - The number (BWF/<FY>/<0001>) is assigned the first time it's needed and
 *   never changes; downloading or re-sending reuses it.
 * - Sending is manual (an admin presses "Send invoice"). Razorpay payments
 *   are sent automatically only when the `invoices.autoSendRazorpay`
 *   setting is on (off by default) — see sendInvoiceAfterRazorpay().
 */

const INVOICE_CONTENT_KEYS = ["invoice.businessName", "invoice.address", "invoice.gstin", "invoice.contact", "invoice.footerNote"];

/** Indian financial year (April–March, IST) of `date`: "2026-27". */
export function financialYearOf(date: Date): string {
  const { year, month } = istParts(date);
  const start = month >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** total (incl. GST) → taxable value + GST, to the paisa; the two always add back to the total. */
export function splitGst(totalInr: number, gstPercent = MEETING_FEE_GST_PERCENT) {
  const totalPaise = Math.round(totalInr * 100);
  const taxablePaise = Math.round((totalPaise * 100) / (100 + gstPercent));
  return { taxableInr: taxablePaise / 100, gstInr: (totalPaise - taxablePaise) / 100, totalInr: totalPaise / 100 };
}

export class InvoiceError extends Error {}

/** The payment's invoice, creating it (and its number) on first use. */
export async function ensureInvoice(paymentId: string) {
  const existing = await db.invoice.findUnique({ where: { paymentId } });
  if (existing) return existing;

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new InvoiceError("Payment not found.");
  if (payment.status !== "APPROVED") throw new InvoiceError("An invoice can only be made for an approved payment.");

  const issuedAt = new Date();
  const financialYear = financialYearOf(issuedAt);
  const amounts = splitGst(Number(payment.amountPaidInr));

  try {
    return await db.$transaction(async (tx) => {
      const seq = await tx.invoiceSequence.upsert({
        where: { financialYear },
        create: { financialYear, last: 1 },
        update: { last: { increment: 1 } },
      });
      return tx.invoice.create({
        data: {
          paymentId,
          financialYear,
          sequence: seq.last,
          number: `BWF/${financialYear}/${String(seq.last).padStart(4, "0")}`,
          issuedAt,
          taxableInr: new Prisma.Decimal(amounts.taxableInr),
          gstInr: new Prisma.Decimal(amounts.gstInr),
          totalInr: new Prisma.Decimal(amounts.totalInr),
          gstPercent: MEETING_FEE_GST_PERCENT,
        },
      });
    });
  } catch (err) {
    // Two admins clicking at once: the second create hits paymentId's unique
    // index (its transaction rolls back, so no number is used up) — return the winner's.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.invoice.findUnique({ where: { paymentId } });
      if (winner) return winner;
    }
    throw err;
  }
}

/** The invoice PDF plus who it's addressed to. Creates the invoice if needed. */
export async function buildInvoice(paymentId: string) {
  const invoice = await ensureInvoice(paymentId);
  const [payment, content] = await Promise.all([
    db.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { member: { include: { chapter: true, company: true, user: { select: { email: true } } } } },
    }),
    getContent(INVOICE_CONTENT_KEYS),
  ]);
  const m = payment.member;
  const isMembership = payment.type === "MEMBERSHIP";
  const meetings = payment.meetingDates.length;

  const description = isMembership
    ? `Annual membership fee${payment.membershipYear ? ` — ${payment.membershipYear}` : ""}`
    : meetings
      ? `Chapter meeting fee — ${meetings} meeting${meetings === 1 ? "" : "s"} package`
      : `Chapter meeting fee — ${payment.numberOfMonths} month${payment.numberOfMonths === 1 ? "" : "s"}`;
  const detail = isMembership ? `${m.chapter.name}` : meetings ? `${m.chapter.name} · Meetings on ${formatMeetingDates(payment.meetingDates)}` : m.chapter.name;

  const email = m.email?.trim() || m.user?.email || null;
  const pdf = await generateInvoicePdf({
    number: invoice.number,
    issuedAt: invoice.issuedAt,
    paidAt: payment.actualPaymentDate,
    issuer: {
      name: content["invoice.businessName"]?.trim() || "Builders World Forum",
      address: content["invoice.address"]?.trim() || null,
      gstin: content["invoice.gstin"]?.trim() || null,
      contact: content["invoice.contact"]?.trim() || null,
    },
    billTo: { name: m.name, company: m.company?.name ?? null, chapter: m.chapter.name, email, phone: m.phone, address: m.address },
    description,
    detail,
    paymentMethod: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
    reference: payment.reference,
    taxableInr: Number(invoice.taxableInr),
    gstInr: Number(invoice.gstInr),
    gstPercent: invoice.gstPercent,
    totalInr: Number(invoice.totalInr),
    footerNote: content["invoice.footerNote"]?.trim() || null,
  });

  return { invoice, pdf, email, memberName: m.name, description, filename: `${invoice.number.replace(/\//g, "-")}.pdf` };
}

export type SendInvoiceResult = { ok: true; message: string; sentTo: string } | { ok: false; error: string };

/** Emails the invoice PDF to the member and records when/where it went. Never throws. */
export async function sendInvoice(paymentId: string, by: "MANUAL" | "AUTO"): Promise<SendInvoiceResult> {
  try {
    const built = await buildInvoice(paymentId);
    if (!built.email) return { ok: false, error: `${built.memberName} has no email address on their profile — add one, then send again.` };

    const total = Number(built.invoice.totalInr).toLocaleString("en-IN", { style: "currency", currency: "INR" });
    await sendEmail({
      to: built.email,
      subject: `Your invoice ${built.invoice.number} — Builders World Forum`,
      text: [
        `Dear ${built.memberName},`,
        "",
        `Thank you for your payment of ${total} for: ${built.description}.`,
        `Your invoice ${built.invoice.number} is attached.`,
        "",
        "Regards,",
        "Builders World Forum — Accounts",
      ].join("\n"),
      attachments: [{ filename: built.filename, content: built.pdf, contentType: "application/pdf" }],
    });

    await db.invoice.update({
      where: { id: built.invoice.id },
      data: { sentAt: new Date(), sentTo: built.email, sendCount: { increment: 1 }, lastSentBy: by },
    });

    const note = isEmailProviderConfigured() ? "" : " (email isn't set up on this server — it was only logged)";
    return { ok: true, sentTo: built.email, message: `Invoice ${built.invoice.number} sent to ${built.email}${note}.` };
  } catch (err) {
    if (err instanceof InvoiceError) return { ok: false, error: err.message };
    console.error("[invoice] send failed", err);
    return { ok: false, error: "The invoice couldn't be sent. Please try again." };
  }
}
