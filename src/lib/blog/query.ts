import type { Prisma } from "@/generated/prisma/client";

/**
 * A SCHEDULED post becomes publicly visible once its scheduledAt time has
 * passed — evaluated lazily at read time rather than needing a cron job to
 * flip status to PUBLISHED. Admin's own list view should NOT use this (it
 * needs to see the real stored status), only public-facing queries.
 */
export const publiclyVisibleBlogWhere: Prisma.BlogWhereInput = {
  OR: [{ status: "PUBLISHED" }, { status: "SCHEDULED", scheduledAt: { lte: new Date() } }],
};
