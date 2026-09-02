# Architecture

This document records decisions made against the Master Brief (`docs/master-brief.pdf`) and
should be updated whenever a new architectural decision is made in a later phase. It is the
single source of truth for "why did we build it this way" — the brief says *what* to build,
this says *how* and *why* specific technical choices were made.

## Confirmed decisions

### Application structure
**Single Next.js app, role-gated route segments** — not separate apps.
- Public pages live directly under `src/app/` (e.g. `src/app/page.tsx`, and future
  `src/app/chapters/[slug]/page.tsx`, `src/app/members/[slug]/page.tsx`, etc.)
- `src/app/admin/` — admin panel, own layout, protected by RBAC (Phase 2+)
- `src/app/member/` — member portal, own layout, protected by member auth (Phase 11+)
- `src/app/api/` — route handlers (form submissions, webhooks, auth)

Rationale: one deployment, one Prisma schema, shared types across all three surfaces, and
far simpler for a solo developer to operate. The tradeoff (public/admin/member all sharing a
build) is acceptable because Next.js route-level code splitting means the luxury public-site
bundle and the dense admin-table bundle never ship to the same visitor.

### Database & ORM
**PostgreSQL via Prisma 7**, using the `prisma-client` generator (not the older
`prisma-client-js`) with the `@prisma/adapter-pg` driver adapter — this is Prisma 7's current
standard pattern, not a stylistic choice. Key differences from older Prisma versions, in case
future phases are built by an agent whose training data predates Prisma 7:
- Config lives in `prisma.config.ts` (not just `schema.prisma`), and `.env` is **not**
  auto-loaded by the Prisma CLI — `prisma.config.ts` explicitly imports `dotenv/config`.
- The generator requires an explicit `output` path (`src/generated/prisma`) — it no longer
  writes into `node_modules`. Import the client from `@/generated/prisma/client`, not
  `@prisma/client`.
- `PrismaClient` must be constructed with an explicit driver adapter
  (`new PrismaPg({ connectionString })`), not a bare `new PrismaClient()`.
- `src/generated/` is gitignored — every environment (including CI/deploy) must run
  `npm run db:generate` before building. Confirm this is wired into the deploy pipeline in
  Phase 14.
- Official Prisma agent-skill docs were installed into `.agents/skills/` during `prisma init`
  and are kept in the repo — consult them before writing Prisma code in later phases rather
  than relying on possibly-outdated training data about Prisma's API.
- **Destructive commands are guarded**: `prisma migrate reset`, `db push --force-reset`, and
  `db push --accept-data-loss` are blocked by Prisma itself pending explicit user consent. Never
  attempt to bypass this — see `.agents/skills/prisma-cli/references/agent-safety.md`.

**Hosting**: Neon (managed Postgres) + Cloudflare R2 (object storage) — chosen for Vercel
compatibility, no egress fees on R2 (matters once member photos/brochures/videos accumulate),
and to avoid vendor lock-in versus an all-in-one platform. Both are provisioned per-environment
(dev/staging/production) per the brief's environment-separation requirement (§7).

### Design system (Phase 1)
- **Fonts**: Fraunces (display/headline, variable serif) + Inter (functional/UI — nav, buttons,
  forms, admin, member portal), both self-hosted via `next/font/google`. Chosen to match the
  brief's editorial-serif + clean-sans pairing without licensing cost; Inter specifically because
  it's what Stripe/Linear/Notion use, matching the brief's explicit admin-panel quality bar.
- **Color tokens** live in `src/app/globals.css` under `@theme` (Tailwind v4's CSS-first config):
  `navy-950/900/800/700/600`, `gold-300/400/500/600`, `ivory-100/200`, `slate-400/500`. Public
  site only for now — admin/member get their own lighter, denser token set when those phases
  land (brief §14 is explicit that admin should not inherit the theatrical public theme).
- **Component primitives**: hand-built (`src/components/ui/`), not a component library —
  `Button` (via `class-variance-authority` for typed variants), `Container`, `SectionLabel`,
  `MediaPlaceholder`. No Radix/shadcn — the brief is explicit the site must not read as a
  default component-library template, and this component surface is small enough that a
  headless-primitives dependency wasn't worth the tradeoff yet. Revisit if Phase 2+ needs real
  overlay/dialog/combobox behavior (RBAC forms, admin tables) — Radix is the natural choice then
  since it doesn't impose visual opinions.
- **Photography**: real photography isn't sourced yet (still an open item below). Every image
  slot uses `<MediaPlaceholder brief="...">` — a textured gradient block with a corner label
  describing what should be shot/sourced for that exact slot. Swapping in real photography later
  is a one-line change per slot (replace with `next/image`), and the `brief` text doubles as a
  shot list.

### Dev tooling
**Playwright** (`devDependencies`) is used only for this developer's own visual QA (screenshotting
pages during a build to verify layout/responsiveness before calling a phase done) — it is not
wired into an automated test suite yet. Reuses this machine's already-cached browser binaries.

### Authentication
**Auth.js (NextAuth)** + a custom OTP/second-factor flow, built in Phase 2. Chosen over a
managed auth-as-a-service (Clerk, Supabase Auth) to avoid per-user recurring cost and vendor
lock-in on a client's core login system. OTP delivery (email and/or SMS) needs a provider
decision before Phase 2 — see Open Decisions below.

### Deployment
Vercel, per the brief. Environments: development (local), staging, production — each with its
own Neon database branch/project and its own env vars (§7). Never develop against production
data.

### Email
Provider-agnostic by design (brief §5, §49) — abstract the transactional-email call behind a
single interface so Resend/Postmark/SES can be swapped without touching call sites. Not wired
up until Phase 13; a concrete provider choice is still open (see below).

## Open decisions (not blocking Phase 0, but needed before the phase that touches them)

These were flagged during the initial brief review and don't have answers yet. Listed here so
they aren't lost, with the phase they'd first block:

| Decision | Needed by | Notes |
|---|---|---|
| ~~Display serif + UI sans-serif typefaces~~ | ~~Phase 1~~ | **Resolved Phase 1**: Fraunces + Inter. |
| ~~Headless component primitives~~ | ~~Phase 1~~ | **Resolved Phase 1**: hand-built, no library — see Design System above. |
| Real chapter names/locations for the 3 active chapters | Phase 3 | Brief explicitly says don't trust old-site numbers as authoritative. Homepage/chapters section currently shows generic "Chapter 01/02/03" placeholders, not fabricated names. |
| Real business-category taxonomy (Plumbing, Architect, etc.) | Phase 3 | Needed to seed the category-exclusivity system. |
| OTP delivery provider (email-only vs. SMS, and which SMS vendor if so) | Phase 2 | Affects admin MFA cost/complexity. |
| Domain name + whether the old site stays live during build | Phase 14–15 | Affects redirect planning and DNS cutover timing. |
| Real photography (or interim placeholder/stock strategy) | Phase 1 (ongoing) | Every image slot is a `MediaPlaceholder` with a shot-list caption in the meantime — see Design System above. Still needs a real answer before launch; placeholders shouldn't ship to production. |
| Founder/Super Admin seed account details | Phase 2 | Needed to create the first real login. |
| WhatsApp Business API + Razorpay business verification | Post-V2 (§71) | Both have real-world verification lead times — worth starting that process independently of the dev timeline if they're wanted eventually. |
| Legal review of Privacy Policy / Terms & Conditions copy | Phase 14 | Site collects member/visitor PII — placeholder pages exist (`/privacy`, `/terms`) but must not launch with AI-drafted legal text unreviewed. |

## Non-negotiables carried from the brief (do not relitigate per phase)

- Category exclusivity (one active member per category per chapter) is enforced at the
  database/business-logic layer, never frontend-only (§15).
- Company and Member are separate models; a company can have multiple members across chapters
  (§14).
- Soft-delete/archive by default; only Super Admin can hard-delete, and only protected/archived
  data (§43).
- Members never directly publish profile edits — everything routes through an admin-approved
  revision (§20).
- No hardcoded chapters, categories, counts, or member data in frontend code (§68).
- No feature from a later phase gets built early, but today's schema/architecture must not
  paint us into a corner that makes a documented future requirement (referrals, member score,
  QR attendance, etc.) require a rewrite later (§72).
