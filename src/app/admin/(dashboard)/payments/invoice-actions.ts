"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { sendInvoice } from "@/lib/invoices";
import { reconcileRazorpayCheckouts } from "@/lib/payments/razorpay";
import { setBooleanSetting } from "@/lib/settings";

/** "Send invoice" button — one click emails the PDF to the member (Super Admin / Accounts). */
export async function sendInvoiceAction(paymentId: string): Promise<{ ok: boolean; message: string }> {
  const session = await requirePermission("payments:approve");
  const result = await sendInvoice(paymentId, "MANUAL");
  if (!result.ok) return { ok: false, message: result.error };
  await logActivity({ userId: session.user.id, action: "invoice.sent", entity: "Payment", entityId: paymentId, metadata: { to: result.sentTo } });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounts");
  return { ok: true, message: result.message };
}

/** Auto-send invoices after Razorpay payments — off by default. */
export async function setInvoiceAutoSend(on: boolean) {
  const session = await requirePermission("payments:approve");
  await setBooleanSetting("invoices.autoSendRazorpay", on);
  await logActivity({ userId: session.user.id, action: on ? "invoice.auto_send_on" : "invoice.auto_send_off", entity: "AppSetting" });
  revalidatePath("/admin/accounts");
}

/** "Sync with Razorpay" — records any online payment the website missed (Super Admin / Accounts). */
export async function syncRazorpayPaymentsAction(): Promise<{ ok: boolean; message: string }> {
  const session = await requirePermission("payments:approve");
  const r = await reconcileRazorpayCheckouts();
  await logActivity({ userId: session.user.id, action: "razorpay.synced", entity: "Payment", metadata: r });
  revalidatePath("/admin/payments");
  revalidatePath("/admin/accounts");
  const msg =
    r.checked === 0
      ? "Nothing waiting — every online checkout is already recorded."
      : `Checked ${r.checked} open checkout(s): ${r.recorded} payment(s) recorded${r.failed ? `, ${r.failed} failed (see logs)` : ""}.`;
  return { ok: r.failed === 0, message: msg };
}
