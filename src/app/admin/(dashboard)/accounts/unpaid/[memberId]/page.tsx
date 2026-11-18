import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getMemberUnpaidSummary } from "@/lib/accounts/unpaid";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments/dates";
import { AdminPageIcon } from "@/components/admin/page-icon";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const badge: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700",
  "Marked paid": "bg-emerald-50 text-emerald-700",
  "Awaiting approval": "bg-amber-50 text-amber-700",
  "Not paid": "bg-red-50 text-red-700",
  "Not started": "bg-neutral-100 text-neutral-500",
};

const statusLabel: Record<string, string> = {
  APPROVED: "Approved",
  PENDING_APPROVAL: "Awaiting approval",
  CLARIFICATION_REQUESTED: "Awaiting approval",
  REJECTED: "Rejected",
};

/** One member's payment summary — opened by clicking a name on the Unpaid Members list. */
export default async function MemberUnpaidSummaryPage({ params }: { params: Promise<{ memberId: string }> }) {
  await requirePermission("accounts:view");
  const { memberId } = await params;
  const data = await getMemberUnpaidSummary(memberId);
  if (!data) notFound();
  const { member, terms, months } = data;
  const dueTerms = terms.filter((t) => t.status === "Not paid").length;
  const dueMonths = months.filter((m) => m.status === "Not paid").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/accounts/unpaid" className="text-sm text-neutral-500 hover:text-emerald-800">
          ← Back to unpaid members
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />
          {member.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {member.chapter.name} · {member.category.name} · {member.company.name}
          {member.phone ? ` · ${member.phone}` : ""}
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Joined {data.joinedKey}
          {member.status !== "ACTIVE" ? ` · ${member.status}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/payments/record" className="rounded-lg bg-emerald-800 px-3 py-2 font-semibold text-white shadow-sm hover:bg-emerald-700">
            Record a payment
          </Link>
          <Link href={`/admin/members/${member.id}`} className="rounded-lg border border-neutral-300 px-3 py-2 font-medium text-neutral-700 hover:border-emerald-700">
            Edit joining date / paid years
          </Link>
          <Link href={`/admin/payments/members?memberId=${member.id}`} className="rounded-lg border border-neutral-300 px-3 py-2 font-medium text-neutral-700 hover:border-emerald-700">
            Full payment history
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Annual membership</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{dueTerms ? `${dueTerms} year(s) not paid` : "Nothing due"}</p>
          <ul className="mt-3 divide-y divide-neutral-100">
            {terms.map((t) => (
              <li key={t.year} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-800">{t.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[t.status]}`}>{t.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Meeting fee — last 12 months</h2>
          <p className="mt-0.5 text-xs text-neutral-500">{dueMonths ? `${dueMonths} month(s) not paid` : "Nothing due"}</p>
          <ul className="mt-3 divide-y divide-neutral-100">
            {months.map((m) => (
              <li key={m.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-800">{m.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[m.status]}`}>{m.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Payments on record</h2>
        {member.payments.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No payments recorded on the website yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  {["Date", "For", "Amount", "How", "Status"].map((h) => (
                    <th key={h} className="py-2 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {member.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap py-2 pr-4 text-neutral-600">{p.actualPaymentDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                    <td className="py-2 pr-4 text-neutral-800">{p.type === "MEMBERSHIP" ? "Annual membership" : "Meeting fee"}</td>
                    <td className="py-2 pr-4 text-neutral-800">{money.format(Number(p.amountPaidInr))}</td>
                    <td className="py-2 pr-4 text-neutral-600">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="py-2 pr-4 text-neutral-600">{statusLabel[p.status] ?? p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
