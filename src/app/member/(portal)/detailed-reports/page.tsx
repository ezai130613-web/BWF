import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";

const TABS = [
  { key: "referrals-given", label: "RFLs Given" },
  { key: "referrals-received", label: "RFLs Received" },
  { key: "business-received", label: "Business Received" },
  { key: "business-given", label: "Business Given" },
  { key: "one-to-ones", label: "One-to-Ones" },
  { key: "power-dates", label: "Power Dates" },
  { key: "conclaves", label: "Conclaves" },
  { key: "visitors", label: "Visitors" },
  { key: "chief-guests", label: "Chief Guests" },
  { key: "consumers", label: "Consumers" },
  { key: "inductions", label: "Inductions" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

type Column = { header: string };
type Row = { key: string; cells: React.ReactNode[] };

async function loadTab(tab: TabKey, memberId: string): Promise<{ columns: Column[]; rows: Row[] }> {
  switch (tab) {
    case "referrals-given": {
      const referrals = await db.referral.findMany({
        where: { fromMemberId: memberId },
        include: { toMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "To" }, { header: "Type" }, { header: "Description" }, { header: "Date" }],
        rows: referrals.map((r) => ({
          key: r.id,
          cells: [r.toMember.name, r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral", r.description ?? "—", r.createdAt.toLocaleDateString()],
        })),
      };
    }
    case "referrals-received": {
      const referrals = await db.referral.findMany({
        where: { toMemberId: memberId },
        include: { fromMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "From" }, { header: "Type" }, { header: "Description" }, { header: "Date" }],
        rows: referrals.map((r) => ({
          key: r.id,
          cells: [r.fromMember.name, r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral", r.description ?? "—", r.createdAt.toLocaleDateString()],
        })),
      };
    }
    case "business-received": {
      const slips = await db.thankYouSlip.findMany({
        where: { fromMemberId: memberId },
        include: { toMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "Thanking" }, { header: "Amount" }, { header: "Description" }, { header: "Date" }],
        rows: slips.map((s) => ({
          key: s.id,
          cells: [s.toMember.name, formatInr(String(s.amountInr)), s.description ?? "—", s.createdAt.toLocaleDateString()],
        })),
      };
    }
    case "business-given": {
      const slips = await db.thankYouSlip.findMany({
        where: { toMemberId: memberId },
        include: { fromMember: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "From" }, { header: "Amount" }, { header: "Description" }, { header: "Date" }],
        rows: slips.map((s) => ({
          key: s.id,
          cells: [s.fromMember.name, formatInr(String(s.amountInr)), s.description ?? "—", s.createdAt.toLocaleDateString()],
        })),
      };
    }
    case "one-to-ones": {
      const items = await db.oneToOne.findMany({
        where: { OR: [{ memberId }, { withMemberId: memberId }] },
        include: { member: true, withMember: true },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [{ header: "With" }, { header: "Notes" }, { header: "Date" }],
        rows: items.map((o) => ({
          key: o.id,
          cells: [o.memberId === memberId ? o.withMember.name : o.member.name, o.notes ?? "—", o.metAt.toLocaleDateString()],
        })),
      };
    }
    case "power-dates": {
      const items = await db.powerDate.findMany({
        where: { hostMemberId: memberId },
        include: { participantMember: true },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [{ header: "Fellow Member" }, { header: "External Contact" }, { header: "Company" }, { header: "Date" }],
        rows: items.map((p) => ({
          key: p.id,
          cells: [p.participantMember.name, p.externalContactName, p.externalContactCompany ?? "—", p.metAt.toLocaleDateString()],
        })),
      };
    }
    case "conclaves": {
      const items = await db.conclave.findMany({
        where: { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }] },
        include: { organizedByMember: true, participants: { include: { member: true } } },
        orderBy: { metAt: "desc" },
      });
      return {
        columns: [{ header: "Participants" }, { header: "Location" }, { header: "Date" }],
        rows: items.map((c) => ({
          key: c.id,
          cells: [
            [c.organizedByMember, ...c.participants.map((p) => p.member)].map((m) => m.name).join(", "),
            c.location ?? "—",
            c.metAt.toLocaleDateString(),
          ],
        })),
      };
    }
    case "visitors":
    case "chief-guests":
    case "consumers": {
      const purposeFilter =
        tab === "visitors"
          ? { OR: [{ purposeOfVisit: null }, { purposeOfVisit: "PROSPECTIVE_MEMBER" as const }] }
          : tab === "chief-guests"
            ? { purposeOfVisit: "CHIEF_GUEST" as const }
            : { purposeOfVisit: "END_CONSUMER" as const };
      const visitors = await db.visitor.findMany({
        where: { referringMemberId: memberId, ...purposeFilter },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "Name" }, { header: "Phone" }, { header: "Status" }, { header: "Date" }],
        rows: visitors.map((v) => ({
          key: v.id,
          cells: [v.name, v.phone, v.status.replace(/_/g, " "), v.createdAt.toLocaleDateString()],
        })),
      };
    }
    case "inductions": {
      const visitors = await db.visitor.findMany({
        where: { referringMemberId: memberId, status: "CONVERTED" },
        orderBy: { createdAt: "desc" },
      });
      return {
        columns: [{ header: "Name" }, { header: "Phone" }, { header: "Registered" }, { header: "Date" }],
        rows: visitors.map((v) => ({
          key: v.id,
          cells: [v.name, v.phone, v.createdAt.toLocaleDateString(), v.updatedAt.toLocaleDateString()],
        })),
      };
    }
  }
}

export default async function DetailedReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { member } = await requireMemberProfile();
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "referrals-given";

  const { columns, rows } = await loadTab(tab, member.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Detailed Reports</h1>
        <p className="mt-1 text-sm text-neutral-600">Go beyond the numbers — exactly who, what, and when.</p>
      </div>

      <nav className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/member/detailed-reports?tab=${t.key}`}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              tab === t.key ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {columns.map((c) => (
                <th key={c.header} className="px-4 py-3 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-3 text-neutral-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-neutral-400">
                  Nothing here yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
