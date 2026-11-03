import Link from "next/link";
import { BadgeCheck, CalendarCheck, CalendarDays, Clock, IndianRupee, Wallet } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { summarizeMemberPayments } from "@/lib/payments/overview";
import { parseFee, quoteMembershipFee } from "@/lib/payments/fees";
import { PaymentMeetingGrid } from "@/components/member/payment-meeting-grid";
import { formatAnnualMembershipFee, formatInr, withGst } from "@/lib/format";
import { formatMonthsCovered } from "@/lib/attendance/manage";
import { formatDateKey, getMemberPaymentContext, paymentCoverageLabel } from "@/lib/payments/coverage";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { PaymentDuesBanner } from "@/components/member/payment-dues-banner";
import { Card, DataTable, PageHeader, StatTile, formatShortDate, tdClass } from "@/components/member/ui";
import { MemberPaymentForm } from "@/components/member/member-payment-form";
import { cn } from "@/lib/utils";
import { QrPaymentBlock } from "@/components/ui/qr-payment-block";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: { label: "Pending approval", className: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700" },
  CLARIFICATION_REQUESTED: { label: "Clarification requested", className: "bg-sky-50 text-sky-700" },
};


/**
 * Member Payments (2026-10-21) — pay the monthly meeting fee or the annual
 * BWF membership from the portal. Since Phase 40 this (and the app's
 * Payments screen) is the only place members pay — QR check-in only marks
 * attendance — and it opens with a month-by-month tick dashboard. Admins
 * share /member/payments?type=meeting|membership links (Admin → Payment
 * Links); a signed-out member goes through login and lands back here.
 */
export default async function MemberPaymentsPage({ searchParams }: { searchParams: Promise<{ type?: string; online?: string }> }) {
  const { member } = await requireMemberProfile();
  const { type: typeParam, online: onlineResult } = await searchParams;
  const type = typeParam === "membership" ? "MEMBERSHIP" : "MEETING";

  const [payments, content, context] = await Promise.all([
    db.payment.findMany({
      where: { memberId: member.id },
      include: { meeting: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getContent([
      "fees.monthlyMeeting",
      "fees.annualMembership",
      "payment.qrCodeUrl",
      "payment.bankAccountName",
      "payment.bankAccountNumber",
      "payment.bankIfsc",
      "payment.upiId",
      "payment.bankName",
      "payment.membershipQrCodeUrl",
      "payment.membershipBankAccountName",
      "payment.membershipBankAccountNumber",
      "payment.membershipBankIfsc",
      "payment.membershipSwiftCode",
      "payment.membershipUpiId",
      "payment.membershipBankName",
    ]),
    getMemberPaymentContext(member.id),
  ]);
  const online = isRazorpayConfigured();
  const { dues } = context;

  const { membershipYears, defaultMembershipYear } = summarizeMemberPayments(payments);
  const monthlyFeeValue = parseFee(content["fees.monthlyMeeting"]);
  const annualFee = formatAnnualMembershipFee(content["fees.annualMembership"]);
  const monthlyFee = formatInr(content["fees.monthlyMeeting"]);

  const details =
    type === "MEETING"
      ? {
          title: "Meeting payment",
          fee: monthlyFee ? `${withGst(monthlyFee)} per month` : null,
          qr: content["payment.qrCodeUrl"],
          upiId: content["payment.upiId"],
          payeeName: content["payment.bankAccountName"],
          rows: [
            ["Account Name", content["payment.bankAccountName"]],
            ["Account Number", content["payment.bankAccountNumber"]],
            ["IFSC Code", content["payment.bankIfsc"]],
            ["Bank", content["payment.bankName"]],
            ["UPI ID", content["payment.upiId"]],
          ],
        }
      : {
          title: "Annual membership (BWF subscription)",
          fee: annualFee ? `${annualFee.withGst} (${annualFee.total} per year incl. GST)` : null,
          qr: content["payment.membershipQrCodeUrl"],
          upiId: content["payment.membershipUpiId"],
          payeeName: content["payment.membershipBankAccountName"],
          rows: [
            ["Account Name", content["payment.membershipBankAccountName"]],
            ["Account Number", content["payment.membershipBankAccountNumber"]],
            ["IFSC Code", content["payment.membershipBankIfsc"]],
            ["SWIFT Code", content["payment.membershipSwiftCode"]],
            ["Bank", content["payment.membershipBankName"]],
            ["UPI ID", content["payment.membershipUpiId"]],
          ],
        };
  const bankRows = details.rows.filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Wallet}
        title="Payments"
        description={
          online
            ? "Pay your meeting fee (by meeting) or your annual BWF membership online with Razorpay. You need both paid to check in at a meeting."
            : "Pay your meeting fee (by meeting) or your annual BWF membership here. Upload the screenshot — once BWF approves it, the meetings it covers get a tick below. You need both paid to check in at a meeting."
        }
      />

      {onlineResult === "paid" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✓ Payment received — thank you. It&apos;s marked paid below.</p>
      ) : onlineResult === "pending" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          We&apos;re waiting for Razorpay to confirm your payment. If you completed it, refresh this page in a minute.
        </p>
      ) : onlineResult === "expired" || onlineResult === "error" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">That payment link wasn&apos;t completed. Please start the payment again.</p>
      ) : null}

      <PaymentDuesBanner name={member.name} dues={dues} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={dues.nextMeeting ? `Next meeting · ${formatDateKey(dues.nextMeeting.date)}` : "Next meeting"}
          icon={CalendarDays}
          value={!dues.nextMeeting ? "—" : dues.nextMeeting.status === "APPROVED" ? "Paid" : dues.nextMeeting.status === "PENDING" ? "Pending" : "Not paid"}
          hint={
            dues.nextMeeting?.status === "PENDING"
              ? "Awaiting BWF approval"
              : dues.nextMeeting?.status === null
                ? `Pay by ${formatDateKey(dues.nextMeeting.payBy)}`
                : undefined
          }
        />
        <StatTile
          label="Meeting fee paid through"
          icon={Clock}
          value={dues.paidThrough ? formatDateKey(dues.paidThrough) : "—"}
          hint={dues.paidThrough ? "Paid meetings, continuous from the next one" : "The next meeting isn't paid yet"}
        />
        <StatTile
          label={`Membership · ${dues.membership.year}`}
          icon={BadgeCheck}
          value={dues.membership.status === "APPROVED" ? "Paid" : dues.membership.status === "PENDING" ? "Pending" : "Not paid"}
          hint={dues.membership.status === "PENDING" ? "Awaiting BWF approval" : dues.membership.status === null ? "Needed to check in at meetings" : undefined}
        />
      </div>

      <Card title="Meeting fee — meeting by meeting" icon={CalendarCheck}>
        <PaymentMeetingGrid tiles={context.tiles} />
      </Card>

      <div className="flex gap-2" role="tablist" aria-label="Payment type">
        {(
          [
            ["MEETING", "meeting", "Meeting fee"],
            ["MEMBERSHIP", "membership", "Annual membership"],
          ] as const
        ).map(([value, slug, label]) => (
          <Link
            key={value}
            href={`/member/payments?type=${slug}`}
            role="tab"
            aria-selected={type === value}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              type === value ? "bg-emerald-800 text-white shadow-sm" : "border border-neutral-300 bg-white text-neutral-700 hover:border-emerald-700",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className={cn("grid gap-6", !online && "lg:grid-cols-2")}>
        {online ? null : (
          <Card title={`How to pay — ${details.title}`} icon={IndianRupee}>
            {details.fee ? (
              <p className="text-sm text-neutral-700">
                Fee: <span className="font-semibold text-neutral-900">{details.fee}</span>
              </p>
            ) : null}
            {details.qr ? <QrPaymentBlock qrCodeUrl={details.qr} upiId={details.upiId} payeeName={details.payeeName} tone="light" /> : null}
            {bankRows.length ? (
              <dl className="mt-4 flex flex-col gap-1.5 border-t border-neutral-100 pt-4 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Or transfer directly</p>
                {bankRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{label}</dt>
                    <dd className="text-right font-medium text-neutral-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {!details.qr && !bankRows.length ? <p className="text-sm text-neutral-500">Payment details will be shared by BWF.</p> : null}
          </Card>
        )}
        <Card
          title={online ? "Pay online" : "Submit your payment"}
          description={online ? "Paid instantly through Razorpay — no screenshot needed." : "Upload the screenshot or receipt — BWF verifies it before it counts."}
        >
          <MemberPaymentForm
            key={type}
            type={type}
            online={online}
            upcoming={context.upcoming}
            perMonth={context.perMonth}
            monthlyFee={monthlyFeeValue}
            membershipTotal={quoteMembershipFee(parseFee(content["fees.annualMembership"]))}
            membershipYears={membershipYears}
            defaultMembershipYear={defaultMembershipYear}
          />
        </Card>
      </div>

      <Card title="Your payment history" bodyClassName="py-0 sm:py-0">
        <DataTable head={["Submitted", "Type", "Covers", "Amount", "Status"]} empty={payments.length ? null : "No payments submitted yet."}>
          {payments.map((p) => {
            const status = STATUS_STYLES[p.status];
            return (
              <tr key={p.id} className="align-top">
                <td className={cn(tdClass, "whitespace-nowrap text-neutral-600")}>{formatShortDate(p.createdAt)}</td>
                <td className={cn(tdClass, "text-neutral-900")}>
                  {p.type === "MEMBERSHIP" ? "Annual membership" : "Meeting fee"}
                  {p.meeting ? <p className="text-xs text-neutral-500">At check-in: {p.meeting.title}</p> : null}
                </td>
                <td className={cn(tdClass, "text-neutral-700")}>
                  {p.type === "MEMBERSHIP" ? `Year ${p.membershipYear}` : paymentCoverageLabel(p, formatMonthsCovered)}
                </td>
                <td className={cn(tdClass, "whitespace-nowrap font-medium text-neutral-900")}>{money.format(Number(p.amountPaidInr))}</td>
                <td className={tdClass}>
                  <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>{status.label}</span>
                  {p.reviewRemarks ? <p className="mt-1 text-xs text-neutral-500">{p.reviewRemarks}</p> : null}
                </td>
              </tr>
            );
          })}
        </DataTable>
      </Card>
    </div>
  );
}
