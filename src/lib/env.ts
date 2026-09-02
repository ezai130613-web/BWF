import { z } from "zod";

/**
 * Server-side environment variable contract.
 *
 * Extend this schema as each phase introduces new required config
 * (auth secrets, storage, email provider, etc.) — see docs/ARCHITECTURE.md.
 * Keeping it centralized means a missing var fails fast at startup with a
 * clear message instead of surfacing as an obscure runtime error later.
 */
const envSchema = z.object({
  DATABASE_URL: z.url(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
