/**
 * GSTIN (2026-10-05 client correction — optional GST number on a company):
 * 2-digit state code + 10-char PAN + entity number + "Z" + checksum char.
 * Spaces are dropped and letters uppercased before checking, so a pasted
 * "29 abcde1234f 1z5" is accepted as 29ABCDE1234F1Z5.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstNumber(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidGstNumber(value: string): boolean {
  return GSTIN_PATTERN.test(value);
}

export const GST_FORMAT_ERROR = "GST number should be 15 characters, like 29ABCDE1234F1Z5.";
