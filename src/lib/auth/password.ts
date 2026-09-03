import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";

/** Shared across admin-user creation, member-portal grant, and password
 * reset (Phase 13) — was duplicated as an inline `z.string().min(12, ...)`
 * in three places once the third call site landed. */
export const PASSWORD_MIN_LENGTH = 12;
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);

/**
 * Argon2id — OWASP's current recommended password hash, chosen over bcrypt
 * for new work. Parameters below follow OWASP's Argon2id baseline
 * (19 MiB memory, 2 iterations, 1 thread) for a server-side login path.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string) {
  return hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(hashed: string, plain: string) {
  return verify(hashed, plain);
}
