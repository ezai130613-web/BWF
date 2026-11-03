import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { buildInvoice, InvoiceError } from "@/lib/invoices";

/** Download a member payment's invoice PDF (Super Admin / Accounts). Creates the invoice number on first download. */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  await requirePermission("payments:approve");
  const { paymentId } = await params;
  try {
    const { pdf, filename } = await buildInvoice(paymentId);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${filename}"`, "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof InvoiceError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
