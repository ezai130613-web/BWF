import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { renderTablePdf } from "@/lib/auth/credentials-pdf";
import { parsePendingFilters, parseUnpaidFilters, pendingItemsReport, reportToPdfInput, unpaidReport } from "@/lib/accounts/reports";

/**
 * 2026-11-17 — PDF versions of the Accounts reports:
 * /api/admin/exports/pdf?report=unpaid-members|pending-items&chapterId&from&to
 * Same filters as the Excel download and the page.
 */
export async function GET(request: Request) {
  const session = await requirePermission("accounts:view");
  const sp = new URL(request.url).searchParams;
  const report = sp.get("report");

  const data =
    report === "unpaid-members"
      ? await unpaidReport(parseUnpaidFilters({ chapterId: sp.get("chapterId"), month: sp.get("month"), from: sp.get("from"), to: sp.get("to"), pending: sp.get("pending") }))
      : report === "pending-items"
        ? await pendingItemsReport(parsePendingFilters({ chapterId: sp.get("chapterId"), assignedTo: sp.get("assignedTo"), from: sp.get("from"), to: sp.get("to"), status: sp.get("status") }))
        : notFound();

  const pdf = await renderTablePdf(reportToPdfInput(data));
  await logActivity({
    userId: session.user.id,
    action: "export.downloaded",
    entity: "Export",
    entityId: `${report}.pdf`,
    metadata: { filters: Object.fromEntries(sp), rows: data.rows.length },
  });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bwf-${report}-${today}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
