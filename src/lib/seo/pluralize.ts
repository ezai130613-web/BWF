/**
 * Basic English pluralization for category names on programmatic SEO
 * landing pages (brief §52: "/architects-in-chennai", "/civil-contractors-
 * in-chennai"). Categories are admin-editable free text (brief §68 — no
 * hardcoded taxonomy), so this can't just be a lookup table; the standard
 * three-rule heuristic (consonant+y → ies; s/x/z/ch/sh → es; else +s)
 * correctly pluralizes every category in the current seed list and is
 * simple enough not to warrant a pluralization library dependency.
 */
export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (/[^aeiou]y$/.test(lower)) return word.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(lower)) return word + "es";
  return word + "s";
}
