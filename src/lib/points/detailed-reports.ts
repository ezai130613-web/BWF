import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";

/**
 * The member's Detailed Reports — one table per activity type. Shared by
 * /member/detailed-reports and the mobile API (Phase 33); every cell is a
 * plain display string so both can render it as-is.
 */

export const DETAILED_REPORT_TABS = [
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
export type DetailedReportTabKey = (typeof DETAILED_REPORT_TABS)[number]["key"];

type Column = { header: string };
type Row = { key: string; cells: string[] };

export async function loadDetailedReport(tab: DetailedReportTabKey, memberId: string): Promise<{ columns: Column[]; rows: Row[] }> {
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
          cells: [r.toMember.name, r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral", r.description ?? "—", r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [r.fromMember.name, r.type === "OUTSIDE" ? "Outside Referral" : "Self / Inside Referral", r.description ?? "—", r.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [s.toMember.name, formatInr(String(s.amountInr)) ?? "—", s.description ?? "—", s.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [s.fromMember.name, formatInr(String(s.amountInr)) ?? "—", s.description ?? "—", s.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [o.memberId === memberId ? o.withMember.name : o.member.name, o.notes ?? "—", o.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [p.participantMember.name, p.externalContactName, p.externalContactCompany ?? "—", p.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
            c.metAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }),
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
          cells: [v.name, v.phone, v.status.replace(/_/g, " "), v.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
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
          cells: [v.name, v.phone, v.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }), v.updatedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })],
        })),
      };
    }
  }
}

export function isDetailedReportTab(value: string | undefined): value is DetailedReportTabKey {
  return DETAILED_REPORT_TABS.some((t) => t.key === value);
}
