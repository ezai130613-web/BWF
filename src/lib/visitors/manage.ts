import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Visitor Management System (2026-09-18). Strips everything but digits and
 * drops a leading country code / trunk zero down to the last 10 digits, so
 * "+91 98765 43210", "09876543210", and "9876543210" all dedupe to the same
 * visitor — "recognise returning visitors using verified identifiers"
 * (spec) only works if formatting variance doesn't defeat it.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(-10) || digits;
}

/**
 * Finds an existing VisitorProfile by normalized phone, or creates one.
 * Reuses the existing profile's identity fields as-is (name/email/etc. are
 * NOT overwritten on a repeat visit) — this dedup exists to link attendance
 * history together, not to silently rewrite a returning visitor's details
 * with whatever they typed this time.
 */
export async function findOrCreateVisitorProfile(
  tx: Prisma.TransactionClient | PrismaClient,
  input: { name: string; phone: string; email?: string; companyName?: string; businessCategory?: string; description?: string },
) {
  const phone = normalizePhone(input.phone);
  const existing = await tx.visitorProfile.findFirst({ where: { phone } });
  if (existing) return existing;

  return tx.visitorProfile.create({
    data: {
      name: input.name,
      phone,
      email: input.email,
      companyName: input.companyName,
      businessCategory: input.businessCategory,
      description: input.description,
    },
  });
}
