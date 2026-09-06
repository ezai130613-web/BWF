import { db } from "@/lib/db";

/**
 * Legal-entity suffixes stripped before comparison, longest first so "pvt
 * ltd" matches before the "ltd" it contains. Covers the Indian entity types
 * (brief's own examples use "Pvt Ltd") plus the common international ones,
 * since nothing in the brief restricts BWF membership to Indian-registered
 * entities specifically.
 */
const LEGAL_SUFFIXES = [
  "private limited",
  "pvt limited",
  "pvt ltd",
  "limited liability partnership",
  "limited",
  "ltd",
  "llp",
  "llc",
  "incorporated",
  "inc",
  "corporation",
  "corp",
  "company",
  "co",
].sort((a, b) => b.length - a.length);

/**
 * Company-name matching on application conversion (backlog #12) was exact-
 * string-only, which meant "Acme Construction Pvt Ltd" and "Acme
 * Construction Pvt. Ltd." — the exact kind of variation a human typing a
 * company name twice produces — created two Company rows for one real
 * business. This normalizes case, punctuation, whitespace, and a trailing
 * legal-entity suffix before comparing, so those variants collapse to the
 * same key. Deliberately not typo-tolerant (Levenshtein/trigram similarity)
 * — that risks silently merging two *different* companies with similar
 * names, which is a worse failure than the duplicate this fixes; revisit
 * with a human-confirmed "did you mean" step if formatting normalization
 * alone doesn't turn out to be enough in practice.
 */
export function normalizeCompanyName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,()]/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of LEGAL_SUFFIXES) {
    if (normalized === suffix) {
      normalized = "";
      break;
    }
    if (normalized.endsWith(` ${suffix}`)) {
      normalized = normalized.slice(0, -(suffix.length + 1)).trim();
      break;
    }
  }

  return normalized;
}

/** Finds an existing Company whose name normalizes to the same key as `companyName`, or null. */
export async function findMatchingCompany(companyName: string) {
  const target = normalizeCompanyName(companyName);
  if (!target) return null;

  const companies = await db.company.findMany({ select: { id: true, name: true } });
  return companies.find((company) => normalizeCompanyName(company.name) === target) ?? null;
}
