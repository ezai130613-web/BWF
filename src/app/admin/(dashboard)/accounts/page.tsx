import Link from "next/link";
import { getUserPermissionKeys, requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getLedgerRows, getLedgerSummary, parseLedgerFilters, STATUS_LABELS } from "@/lib/accounts/ledger";
import { PaymentReviewActions } from "@/components/admin/payment-review-actions";
import { VisitorPaymentReviewActions } from "@/components/admin/visitor-payment-review-actions";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const PAGE_LIMIT = 200;

/**
 * Phase 29 — Accounts workspace home: every member and visitor payment across
 * all chapters in one ledger (who paid, purpose, amount, status, reviewer),
 * with approve/reject inline for callers holding payments:approve (Super
 * Admin + Accounts Department). accounts:view is a blanket permission —
 * never chapter-scoped — so there's no chapter scoping branch here.
 */
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; chapterId?: string; q?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("accounts:view");
  const permissions = await getUserPermissionKeys(session.user.id);
  const canApprove = permissions.has("payments:approve");

  const params = await searchParams;
  const filters = parseLedgerFilters(params);

  const [rows, summary, chapters] = await Promise.all([
    getLedgerRows(filters, PAGE_LIMIT),
    getLedgerSummary(filters),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  const pending = {
    count: summary.PENDING_APPROVAL.count + summary.CLARIFICATION_REQUESTED.count,
    amountInr: summary.PENDING_APPROVAL.amountInr + summary.CLARIFICATION_REQUESTED.amountInr,
  };
  const totalSubmitted = Object.values(summary).reduce((t, s) => t + s.amountInr, 0);

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  ).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">All Payments</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Complete payment history across all chapters — member membership fees and visitor
            meeting fees in one list. Pending submissions are never counted as received.
          </p>
        </div>
        <Link
          href={`/api/admin/exports/accounts${exportQuery ? `?${exportQuery}` : ""}`}
          className="text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          Export Excel
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Submitted" value={money.format(totalSubmitted)} />
        <StatCard label="Approved (received)" value={money.format(summary.APPROVED.amountInr)} hint={`${summary.APPROVED.count} payments`} tone="emerald" />
        <StatCard label="Pending" value={money.format(pending.amountInr)} hint={`${pending.count} awaiting review`} tone="amber" />
        <StatCard label="Rejected" value={money.format(summary.REJECTED.amountInr)} hint={`${summary.REJECTED.count} payments`} tone="red" />
      </div>

      <form action="/admin/accounts" method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <Field label="Type">
          <select name="type" defaultValue={filters.type ?? ""} className={inputClass}>
            <option value="">Members &amp; visitors</option>
            <option value="MEMBER">Member payments</option>
            <option value="VISITOR">Visitor payments</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={filters.status ?? ""} className={inputClass}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chapter">
          <select name="chapterId" defaultValue={filters.chapterId ?? ""} className={inputClass}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paid by">
          <input name="q" defaultValue={filters.q} placeholder="Name or visitor phone…" className={inputClass} />
        </Field>
        <Field label="Paid from">
          <input type="date" name="from" defaultValue={filters.from} className={inputClass} />
        </Field>
        <Field label="Paid to">
          <input type="date" name="to" defaultValue={filters.to} className={inputClass} />
        </Field>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Apply
        </button>
        <Link href="/admin/accounts?status=PENDING_APPROVAL" className="text-sm text-amber-700 underline hover:text-amber-900">
          Show pending only
        </Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Paid on</th>
              <th className="px-4 py-3">Paid by</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={`${row.type}-${row.id}`} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-neutral-900">
                  {row.paymentDate.toLocaleDateString("en-IN")}
                  <p className="text-xs text-neutral-400">Submitted {row.submittedAt.toLocaleDateString("en-IN")}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{row.payerName}</p>
                  <p className="text-xs text-neutral-500">
                    <span className={row.type === "MEMBER" ? "text-indigo-700" : "text-teal-700"}>{row.type === "MEMBER" ? "Member" : "Visitor"}</span>
                    {" · "}
                    {row.chapterName}
                    {row.payerContact ? ` · ${row.payerContact}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-neutral-900">{row.purpose}</p>
                  <p className="text-xs text-neutral-500">
                    {row.meetingTitle} — {row.meetingDate.toLocaleDateString("en-IN")}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-neutral-900">{money.format(row.amountInr)}</td>
                <td className="min-w-56 px-4 py-3">
                  <StatusBadge status={row.status} />
                  {row.reviewedBy ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      by {row.reviewedBy}
                      {row.reviewedAt ? ` · ${row.reviewedAt.toLocaleDateString("en-IN")}` : ""}
                    </p>
                  ) : null}
                  {row.reviewRemarks ? <p className="mt-1 text-xs text-neutral-500">Remarks: {row.reviewRemarks}</p> : null}
                  {canApprove ? (
                    row.type === "MEMBER" ? (
                      <PaymentReviewActions paymentId={row.id} status={row.status} />
                    ) : (
                      <VisitorPaymentReviewActions visitorPaymentId={row.id} status={row.status} />
                    )
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <a href={row.proofUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-neutral-900">
                    View
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No payments match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length === PAGE_LIMIT ? (
        <p className="text-xs text-neutral-500">
          Showing the latest {PAGE_LIMIT} payments — narrow the filters, or use Export Excel for the complete list.
        </p>
      ) : null}
    </div>
  );
}

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">{label}{children}</label>;
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "emerald" | "amber" | "red" }) {
  const toneClass = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : tone === "red" ? "text-red-700" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: keyof typeof STATUS_LABELS }) {
  const styles: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-50 text-amber-700",
    APPROVED: "bg-emerald-50 text-emerald-700",
    REJECTED: "bg-red-50 text-red-700",
    CLARIFICATION_REQUESTED: "bg-sky-50 text-sky-700",
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>{STATUS_LABELS[status]}</span>;
}
