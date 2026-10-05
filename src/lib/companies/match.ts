import { db } from "@/lib/db";
import { normalizeCompanyName } from "./normalize";

export { normalizeCompanyName };

/** Finds an existing Company whose name normalizes to the same key as `companyName`, or null. */
export async function findMatchingCompany(companyName: string) {
  const target = normalizeCompanyName(companyName);
  if (!target) return null;

  const companies = await db.company.findMany({ select: { id: true, name: true } });
  return companies.find((company) => normalizeCompanyName(company.name) === target) ?? null;
}
