import { createHash, randomInt } from "node:crypto";

const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode() {
  return Array.from({ length: OTP_LENGTH }, () => randomInt(0, 10)).join("");
}

/**
 * OTP codes are short-lived, single-use, and attempt-limited — the defense
 * here is expiry + lockout, not hash cost, so a fast SHA-256 digest is
 * appropriate (unlike password hashing, which uses Argon2id).
 */
export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}
