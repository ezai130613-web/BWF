import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { getBooleanSetting } from "@/lib/settings";
import { parseFee, quoteMembershipFee } from "@/lib/payments/fees";
import { getMeetingPackages } from "@/lib/payments/packages";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { RecordPaymentForm } from "@/components/admin/record-payment-form";
import { AttendancePaymentSwitch } from "@/components/admin/attendance-payment-switch";

/**
 * Record Offline Payment (client, 2026-11-03) — Accounts / Super Admin enter
 * a member's cash, bank transfer, UPI or cheque payment. It's approved
 * immediately and counts toward attendance like a Razorpay payment.
 */
export default async function RecordPaymentPage() {
  await requirePermission("payments:approve");
  const [members, content, requirePayment] = await Promise.all([
    db.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, phone: true, chapter: { select: { name: true } }, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    getContent(["fees.annualMembership"]),
    getBooleanSetting("attendance.requirePayment"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />Record Offline Payment
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          For members who paid by cash, bank transfer, UPI or cheque — meeting fee or annual membership. It is approved straight away.
        </p>
      </div>

      <AttendancePaymentSwitch on={requirePayment} />

      <RecordPaymentForm
        members={members.map((m) => ({ id: m.id, phone: m.phone ?? undefined, label: `${m.name} — ${m.chapter.name}${m.category?.name ? ` · ${m.category.name}` : ""}` }))}
        packages={await getMeetingPackages()}
        membershipFee={parseFee(content["fees.annualMembership"])}
        membershipTotal={quoteMembershipFee(parseFee(content["fees.annualMembership"]))}
      />
    </div>
  );
}
