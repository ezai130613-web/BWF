import Link from "next/link";
import { getPaymentsScope } from "@/lib/auth/rbac";
import { getContent } from "@/lib/content";
import { formatAnnualMembershipFee, formatInr, withGst } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { PaymentLinkCard } from "@/components/admin/payment-link-card";

/**
 * Payment Links (2026-10-21) — direct links to the member portal's Payments
 * page, for sending to members outside of meeting check-in. Members sign in
 * (or are sent through login) and pay from their own account, so the link
 * itself carries nothing member-specific and is safe to broadcast.
 */
export default async function PaymentLinksPage() {
  await getPaymentsScope();
  const content = await getContent(["fees.monthlyMeeting", "fees.annualMembership"]);
  const monthly = formatInr(content["fees.monthlyMeeting"]);
  const annual = formatAnnualMembershipFee(content["fees.annualMembership"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Payment Links</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Send members a direct link to pay — no meeting check-in needed. The link opens the Payments
            page in their member login; submissions arrive in Payments as Pending Approval like any other.
          </p>
        </div>
        <Link href="/admin/payments" className="text-sm text-neutral-600 underline hover:text-emerald-800">
          ← Payments
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PaymentLinkCard
          title="Meeting payment (monthly)"
          description={`Monthly meeting fee${monthly ? ` — ${withGst(monthly)} per month` : ""}. Members can pay for one or several months at once; approved months aren't asked for again at check-in.`}
          url={`${SITE_URL}/member/payments?type=meeting`}
          defaultMessage="Dear BWF member, please pay your monthly meeting fee using the link below. Sign in to your member account, pay via the QR/bank details shown, and upload your payment screenshot."
          qrFilename="BWF_Meeting_Payment_QR.png"
        />
        <PaymentLinkCard
          title="Annual membership (BWF subscription)"
          description={`Yearly BWF membership${annual ? ` — ${annual.withGst} (${annual.total} incl. GST)` : ""}.`}
          url={`${SITE_URL}/member/payments?type=membership`}
          defaultMessage="Dear BWF member, your annual BWF membership subscription is due. Please sign in using the link below, pay via the QR/bank details shown, and upload your payment screenshot."
          qrFilename="BWF_Membership_Payment_QR.png"
        />
      </div>
    </div>
  );
}
