import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Singleton Prisma client, cached on `globalThis` in development so that
 * Next.js's hot-module-reload doesn't spin up a fresh connection pool on
 * every file save and exhaust the database's connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // `max` caps how many Postgres connections this one process opens. Without
  // it, `next build`'s several concurrent static-generation workers (each
  // its own process, each with its own pool) could collectively open enough
  // connections to overwhelm the local `prisma dev` proxy — the documented
  // local-dev instability in docs/ARCHITECTURE.md, hit again during Phase
  // 10's build once one more DB-touching route (the sitemap) was added. A
  // small cap is also just good practice against a real serverless deploy
  // target (Vercel + Neon), where many concurrent function instances each
  // opening a large pool is a known way to exhaust a database's connection
  // limit — not only a workaround for this local quirk.
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
