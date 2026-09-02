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
