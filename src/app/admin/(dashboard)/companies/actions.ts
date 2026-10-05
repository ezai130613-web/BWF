"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { normalizeCompanyName } from "@/lib/companies/normalize";
import { GST_FORMAT_ERROR, isValidGstNumber, normalizeGstNumber } from "@/lib/companies/gst";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  gstNumber: z.string().optional(),
});

export async function createCompany(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await requirePermission("companies:manage");

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    description: formData.get("description") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    gstNumber: formData.get("gstNumber") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const gstNumber = parsed.data.gstNumber ? normalizeGstNumber(parsed.data.gstNumber) : undefined;
  if (gstNumber && !isValidGstNumber(gstNumber)) return { error: GST_FORMAT_ERROR };

  // Same duplicate rules as adding a company from the Add member form.
  const target = normalizeCompanyName(parsed.data.name);
  const existing = await db.company.findMany({ select: { name: true, gstNumber: true } });
  const duplicate = existing.find((c) => normalizeCompanyName(c.name) === target);
  if (duplicate) return { error: `“${duplicate.name}” already exists.` };
  const gstOwner = gstNumber ? existing.find((c) => c.gstNumber === gstNumber) : undefined;
  if (gstOwner) return { error: `GST number ${gstNumber} is already registered to “${gstOwner.name}”.` };

  const company = await db.company.create({ data: { ...parsed.data, name: parsed.data.name.trim(), gstNumber } });

  await logActivity({
    userId: session.user.id,
    action: "company.created",
    entity: "Company",
    entityId: company.id,
  });

  revalidatePath("/admin/companies");
  revalidatePath("/admin/members");
  return { error: undefined };
}
