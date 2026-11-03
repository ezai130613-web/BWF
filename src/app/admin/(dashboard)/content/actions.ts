"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { MEETING_PACKAGE_SIZES, MEETING_PACKAGES_KEY, packageError, type MeetingPackage } from "@/lib/payments/fees";

export async function updateWebsiteContent(key: string, formData: FormData) {
  const session = await requirePermission("content:manage");

  const value = formData.get("value");
  await db.websiteContent.update({
    where: { key },
    data: { value: typeof value === "string" && value.trim() ? value : null },
  });

  await logActivity({
    userId: session.user.id,
    action: "website_content.updated",
    entity: "WebsiteContent",
    entityId: key,
  });

  // Content blocks are scattered across whichever public pages read them —
  // simplest correct option is to revalidate broadly rather than track
  // which page(s) each key affects individually.
  revalidatePath("/", "layout");
}

export type MeetingPackagesState = { error?: string; success?: boolean };

/** Website Content → Fees: the 2/6/12/24-meeting packages (fees + discount each). Final fee = fees − discount, + GST. */
export async function updateMeetingPackages(
  _prev: MeetingPackagesState | undefined,
  formData: FormData,
): Promise<MeetingPackagesState> {
  const session = await requirePermission("content:manage");

  const packages: MeetingPackage[] = [];
  for (const meetings of MEETING_PACKAGE_SIZES) {
    const fee = Number(formData.get(`fee_${meetings}`));
    const discountRaw = formData.get(`discount_${meetings}`);
    const discount = discountRaw === null || discountRaw === "" ? 0 : Number(discountRaw);
    const p = { meetings, fee: Math.round(fee * 100) / 100, discount: Math.round(discount * 100) / 100 };
    const error = packageError(p);
    if (error) return { error };
    packages.push(p);
  }

  await db.websiteContent.upsert({
    where: { key: MEETING_PACKAGES_KEY },
    create: { key: MEETING_PACKAGES_KEY, label: "Meeting fee packages", section: "Fees", value: JSON.stringify(packages) },
    update: { value: JSON.stringify(packages) },
  });

  await logActivity({
    userId: session.user.id,
    action: "website_content.updated",
    entity: "WebsiteContent",
    entityId: MEETING_PACKAGES_KEY,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
