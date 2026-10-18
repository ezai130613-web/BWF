import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { createSignedDownloadUrl } from "@/lib/storage";

/**
 * Opens an applicant's Aadhaar card (2026-10-19) through a 5-minute signed
 * link, so the file itself never has a URL stored or shown anywhere. Each
 * view is written to the activity log.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("applications:manage");
  const { id } = await params;

  const application = await db.membershipApplication.findUnique({ where: { id }, select: { aadhaarFileKey: true } });
  if (!application?.aadhaarFileKey) {
    return NextResponse.json({ error: "No Aadhaar card on this application." }, { status: 404 });
  }

  const url = await createSignedDownloadUrl(application.aadhaarFileKey);

  await logActivity({
    userId: session.user.id,
    action: "application.aadhaar_viewed",
    entity: "MembershipApplication",
    entityId: id,
  });

  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
}
