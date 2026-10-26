import Link from "next/link";
import { BadgeCheck, CalendarDays, Clock, IndianRupee, Wallet } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { summarizeMemberPayments } from "@/lib/payments/overview";
import { formatAnnualMembershipFee, formatInr, withGst } from "@/lib/format";
import { formatMonthYear, formatMonthsCovered } from "@/lib/attendance/manage";
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
 * BWF membership from the portal, without checking in at a meeting. Admins
 * share /member/payments?type=meeting|membership links (Admin → Payment
 * Links); a signed-out member goes through login and lands back here.
 */
export default async function MemberPaymentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { member } = await requireMemberProfile();
  const { type: typeParam } = await searchParams;
  const type = typeParam === "membership" ? "MEMBERSHIP" : "MEETING";

  const [payments, content] = await Promise.all([
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
  ]);

  const { today, thisMonth, thisMonthStatus, paidThrough, startMonth, membershipThisYear, membershipYears, defaultMembershipYear } =
    summarizeMemberPayments(payments);

  const annualFee = formatAnnualMembershipFee(content["fees.annualMembership"]);
  const monthlyFee = formatInr(content["fees.monthlyMeeting"]);

  const details =
    type === "MEETING"
      ? {
          title: "Meeting payment (monthly)",
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
        description="Pay your monthly meeting fee or your annual BWF membership. Once BWF approves a payment, the months it covers won't be asked for again at meeting check-in."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={`Meeting fee · ${formatMonthYear(thisMonth)}`}
          icon={CalendarDays}
          value={thisMonthStatus === "APPROVED" ? "Paid" : thisMonthStatus === "PENDING" ? "Pending" : "Not paid"}
          hint={thisMonthStatus === "PENDING" ? "Awaiting BWF approval" : thisMonthStatus === null ? "No approved payment recorded" : undefined}
        />
        <StatTile
          label="Meeting fee paid through"
          icon={Clock}
          value={paidThrough ? formatMonthYear(paidThrough) : "—"}
          hint={paidThrough ? "Approved months, continuous from this month" : "Nothing approved from this month on yet"}
        />
        <StatTile
          label={`Membership · ${today.year}`}
          icon={BadgeCheck}
          value={membershipThisYear === "APPROVED" ? "Paid" : membershipThisYear === "PENDING" ? "Pending" : "Not paid"}
          hint={membershipThisYear === "PENDING" ? "Awaiting BWF approval" : membershipThisYear === null ? "No approved payment recorded" : undefined}
        />
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Payment type">
        {(
          [
            ["MEETING", "meeting", "Meeting payment (monthly)"],
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

      <div className="grid gap-6 lg:grid-cols-2">
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

        <Card title="Submit your payment" description="Upload the screenshot or receipt — BWF verifies it before it counts.">
          <MemberPaymentForm
            key={type}
            type={type}
            startMonth={startMonth}
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
                  {p.type === "MEMBERSHIP" ? `Year ${p.membershipYear}` : formatMonthsCovered(p.monthsCovered)}
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
