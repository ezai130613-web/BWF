# Builders World Forum — Website V2

Production platform for Builders World Forum: public website, member directory, admin panel,
membership/chapter operations, and (progressively) events, analytics, and AI infrastructure.

Full product/technical brief: [`docs/master-brief.pdf`](docs/master-brief.pdf).
Architecture decisions and conventions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Phase-by-phase build log: [`docs/PHASES.md`](docs/PHASES.md).

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS · PostgreSQL · Prisma · Auth.js.
See `docs/ARCHITECTURE.md` for the full rationale and provider choices.

## Getting started

```bash
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, SEED_SUPER_ADMIN_*
npm install

# Local Postgres — swap DATABASE_URL for Neon (or similar) when you have one:
npx prisma dev --name bwf --detach

npm run db:migrate     # applies prisma/migrations/
npm run db:seed        # creates roles/permissions + the Super Admin from .env
npm run dev
```

Open http://localhost:3000 (public site) or http://localhost:3000/admin/login (admin — sign in
with the `SEED_SUPER_ADMIN_EMAIL`/`_PASSWORD` from your `.env`; with no email provider
configured, the OTP code is printed to the terminal instead of emailed).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Standalone TypeScript check |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:migrate` | Create/apply a dev migration |
| `npm run db:seed` | Seed roles/permissions + the Super Admin account |
| `npm run db:studio` | Open Prisma Studio |

## Project structure

```
src/
  app/
    (public pages live directly under app/, e.g. app/page.tsx, app/chapters/...)
    admin/     — admin panel (role-gated, Phase 2+)
    member/    — member portal (role-gated, Phase 11+)
    api/       — route handlers
  components/  — shared UI (Phase 1+)
  lib/         — db client, env validation, shared utilities
  generated/   — Prisma client output (generated, not committed)
prisma/
  schema.prisma
```

This is a single Next.js application with role-gated route segments rather than separate
apps — see `docs/ARCHITECTURE.md` for why.

## Development approach

This project is built phase-by-phase per `docs/master-brief.pdf` §69–72. Each phase ends with
lint + typecheck + build + manual verification + a documented entry in `docs/PHASES.md` before
the next phase starts. Do not skip ahead to features from a later phase.

## Deployment

Preferred stack per the brief: Vercel + managed PostgreSQL (Neon) + managed object storage. This
hasn't been exercised against real infrastructure yet (no live deployment exists) — treat this as
a runbook to follow, not a description of something already tested.

1. **Provision Neon** (or another managed Postgres) and copy its pooled connection string.
2. **Connect the repo to a new Vercel project.** Vercel auto-detects Next.js; no custom build
   command is needed — `postinstall` already runs `prisma generate` (see `package.json`), so a
   fresh `npm install` regenerates the Prisma client automatically.
3. **Set every env var from `.env.example`** in the Vercel project (Production *and* Preview
   environments, with different values where that matters — e.g. a Preview `DATABASE_URL`
   pointing at a Neon branch, not the production database):
   - `DATABASE_URL`, `AUTH_SECRET` (generate a fresh one, don't reuse a local dev value),
     `AUTH_URL` (the real deployed origin)
   - `SEED_SUPER_ADMIN_EMAIL`/`_NAME`/`_PASSWORD` — only needed for the one-time seed run, not at
     runtime; use real founder credentials, not the checked-in local-dev placeholders
   - `EMAIL_PROVIDER`/`EMAIL_API_KEY`/`EMAIL_FROM_ADDRESS` — without these, every transactional
     email (OTP, password reset, notifications, weekly reports) silently logs to the server
     console instead of sending, which is invisible in a deployed environment
   - `NOTIFICATION_EMAIL` — the business alert address (new applications, new chatbot leads)
   - `CRON_SECRET` — generate a real random value; this is also what authenticates
     `vercel.json`'s weekly-report cron request
   - `ANTHROPIC_API_KEY` — optional; Ask BWF shows an honest "not available" state without it
   - `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`,
     `NEXT_PUBLIC_WHATSAPP_NUMBER` — all optional, each feature no-ops cleanly without its own
   - Object storage vars (`STORAGE_*`) — not yet wired up to any upload UI (see
     `docs/ARCHITECTURE.md`'s open decisions), reserved for when that lands
4. **Apply migrations before the new code serves traffic**: run `npx prisma migrate deploy`
   against the production `DATABASE_URL` (locally, or as a manual CI step) — deliberately **not**
   folded into the Vercel build command itself, so a migration is always a deliberate action, not
   a side effect of every push (see `docs/ARCHITECTURE.md`'s Production Readiness section for why).
5. **Seed once**: `npm run db:seed` against the production database (creates roles/permissions and
   the real Super Admin from the env vars above) — safe to re-run later (upserts throughout).
6. **Verify the cron is registered**: Vercel picks up `vercel.json`'s schedule automatically on
   deploy; confirm it under the project's Cron Jobs tab, and that a manual `curl` with the real
   `Authorization: Bearer $CRON_SECRET` header against `/api/cron/weekly-report` behaves as
   expected before relying on the schedule.
7. **Backups**: Neon takes these automatically (point-in-time recovery via branching) — nothing to
   configure in this application. See `docs/ARCHITECTURE.md`'s Production Readiness section for
   the restore procedure and the manual `pg_dump` fallback.
