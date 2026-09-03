/**
 * Public base URL — used for absolute URLs in JSON-LD, the sitemap, and
 * `metadataBase`. Real domain is an open decision (brief §7/§65, tracked in
 * docs/ARCHITECTURE.md, needed by Phase 14–15) — falls back to localhost so
 * nothing breaks in dev before that's set.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
