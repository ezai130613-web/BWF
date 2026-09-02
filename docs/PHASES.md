# Phase log

Per the Master Brief §69–70. One entry per phase: what shipped, verification performed, and
known issues/follow-ups carried forward. Do not start a phase until the previous one's entry
is complete and committed.

---

## Phase 0 — Architecture & Project Setup

**Status:** Complete

**What shipped:**
- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, scaffolded via `create-next-app`.
- Prisma 7 initialized for PostgreSQL, using the `prisma-client` generator + `@prisma/adapter-pg`
  driver adapter (Prisma 7's current standard pattern — see `docs/ARCHITECTURE.md`). Schema has
  no models yet; that's Phase 2.
- Route skeleton for the three application surfaces: public (`src/app/`), admin
  (`src/app/admin/`), member portal (`src/app/member/`), each a placeholder confirming the
  route resolves — no real UI or auth yet.
- `src/lib/db.ts` — Prisma client singleton (dev-safe against HMR connection exhaustion).
- `src/lib/env.ts` — Zod-validated server env access, extend as new required vars land per phase.
- `src/lib/utils.ts` — `cn()` class-merging helper for Tailwind (clsx + tailwind-merge).
- `src/app/api/health/route.ts` — trivial health-check endpoint, useful once deployed.
- `.env.example` — documents every env var the brief anticipates, grouped by the phase that
  wires it up, so nothing gets forgotten later. Only `DATABASE_URL` is required right now.
- `.gitignore` fixed so `.env.example` is tracked while all real `.env*` files stay ignored
  (the create-next-app default would have ignored the example file too).
- `npm audit` fix: `create-next-app` + `prisma init` pulled in a Prisma 8 release-candidate
  with 13 high/moderate transitive vulnerabilities (via `@prisma/dev`'s bundled tooling); pinned
  to stable Prisma 7.10.0 and added `overrides` for two still-vulnerable transitive deps
  (`mysql2`, `deepmerge-ts`, both dev-tooling-only, unrelated to our Postgres runtime). Audit is
  now clean.
- `docs/ARCHITECTURE.md` — decisions log + open-decisions table.
- `README.md` — replaced the create-next-app default with real project docs.

**Verification performed:**
- `npm run build` — succeeds, type-checks clean, all 5 routes compile (`/`, `/admin`, `/member`,
  `/api/health`, `/_not-found`).
- `npx tsc --noEmit` — clean.
- `npm run lint` — clean, no warnings.
- `npm audit` — 0 vulnerabilities.
- Booted `npm run dev` and curled all three surfaces + the health endpoint — all returned 200
  with the expected placeholder content.
- Not yet applicable: no database, no tests, no responsive/visual check (no real UI yet).

**Known issues / follow-ups:**
- No database is provisioned yet (local or Neon) — `DATABASE_URL` in `.env` is a placeholder.
  Prisma commands that need a live connection haven't been exercised end-to-end.
- Font pairing, component-primitive library, and real brand assets are undecided — see Open
  Decisions in `docs/ARCHITECTURE.md`. Phase 1 shouldn't start design work until at least fonts
  are picked.
- Repo has not been pushed to a GitHub remote yet (brief §6: "GitHub from Day 1") — local git
  history exists; needs a remote to actually satisfy that requirement.
- No CI configured yet (lint/typecheck/build-on-push) — reasonable to add once there's a
  GitHub remote to run it against.

---

## Phase 1 — Public Website UI

**Status:** Complete

**What shipped:**
- Design system: Fraunces (display) + Inter (functional) fonts; color tokens (navy/gold/ivory/
  slate) in `src/app/globals.css`; `Button`, `Container`, `SectionLabel`, `MediaPlaceholder`
  primitives in `src/components/ui/`. See `docs/ARCHITECTURE.md` for rationale.
- Restructured routing: public pages moved under a `(public)` route group with their own layout
  (header/footer/WhatsApp CTA) so `/admin` and `/member` don't inherit the public theme — the
  brief is explicit admin should feel like functional enterprise software, not the theatrical
  public site (§14).
- Global chrome: `Header` (responsive nav with working mobile menu, verified via screenshot),
  `Footer`, floating `WhatsAppCta` (renders nothing until `NEXT_PUBLIC_WHATSAPP_NUMBER` is set —
  no dead link ships).
- Homepage: hero, about/intro, why-BWF (3 pillars), chapters (generic placeholder panels, not
  fabricated names), find-a-professional teaser, inside-BWF photo grid, an oversized-typography
  statement section, insights/events teasers (honest "ships in Phase X" state — no fabricated
  blog titles or event listings), closing membership CTA. Section copy and the two oversized
  statement lines are adapted directly from the brief's own suggested copy (§17, §6), not
  invented.
- Placeholder pages for every nav/footer destination that doesn't have a real phase yet:
  `/about`, `/chapters`, `/members`, `/insights`, `/events`, `/apply`, `/privacy`, `/terms` —
  each names the phase that delivers real content, so nothing 404s.
- Accessibility basics: skip-to-content link, visible focus states on all interactive elements,
  `prefers-reduced-motion` handling, semantic landmarks (`header`/`main`/`footer`/`nav`).
- Added Playwright as a dev-only tool for this developer's own visual QA (not a test suite).

**Verification performed:**
- `npm run build`, `npm run lint`, `npm run typecheck` — all clean. `npm audit` — 0
  vulnerabilities.
- All 13 routes compile (home + 8 placeholder pages + admin/member/health/not-found).
- Screenshotted the homepage at desktop (1440px) and mobile (390px) via Playwright, plus the
  mobile nav menu in its open state — reviewed visually, not just "it compiled." Iterated once
  on `MediaPlaceholder` (initial version read as empty/flat; added texture + glow so it reads as
  an intentional photography slot).
- Did not verify: real cross-browser testing (Chromium only), Lighthouse/Core Web Vitals
  (nothing to measure yet without real images/fonts under production conditions), screen-reader
  pass (only structural a11y — landmarks, focus, skip link — verified, not an actual AT pass).

**Known issues / follow-ups:**
- No real photography — every image slot is a placeholder. This must be resolved before
  production launch, not left for Phase 14.
- Chapter section shows 3 generic placeholder panels; becomes data-driven in Phase 3.
- Insights/Events sections are intentionally inert "coming soon" states until Phases 5/8 ship
  real content — don't mistake this for a bug.
- `/privacy` and `/terms` are placeholders, not real legal text — flagged in
  `docs/ARCHITECTURE.md` open decisions, needs actual legal review before launch.
- GA4/Search Console (brief §50) not wired up yet — that's Phase 10.

---

## Phase 2 — Database + Authentication + Admin Foundation

**Status:** Complete

**What shipped:**
- Schema: `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `OtpChallenge`,
  `AuditLog` (`prisma/migrations/20260902190702_auth_rbac_foundation`). Deliberately does not
  include Member/Company/Chapter/Category or any other Phase 3+ entity — see the schema's own
  header comment. `Role` is seeded with all four role keys (SUPER_ADMIN, CENTRAL_ADMIN,
  CHAPTER_ADMIN, MEMBER) as reference data, but only SUPER_ADMIN/CENTRAL_ADMIN are functional —
  Chapter Admin's per-chapter scoping is added alongside the Chapter model in Phase 3.
- Two-step admin login: email+password (`/api/admin/auth/request-otp`, with account lockout
  after 5 failed attempts) then a 6-digit OTP (NextAuth Credentials provider `admin-otp`,
  10-minute expiry, 5 attempts). Full design rationale in `docs/ARCHITECTURE.md`.
- JWT sessions with real server-side revocation via `User.sessionVersion`, checked against the
  database on every request — not just relying on JWT expiry.
- `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) redirects unauthenticated visitors away
  from `/admin/**`; every protected page/Server Action *also* calls
  `requireAdminSession()`/`requirePermission()` directly, per Next's own guidance that proxy
  matchers can silently stop covering a route.
- Admin foundation UI at `/admin/login`, `/admin` (dashboard shell), `/admin/users` (list +
  create admin users + suspend/reactivate), `/admin/roles` (permission matrix, Super Admin row
  locked to prevent self-lockout), `/admin/activity` (audit log viewer). Admin uses its own
  light/neutral theme (dark navy sidebar, white workspace) — does not inherit the public site's
  dark luxury theme, per brief §14.
- `requireRecentAuth()` — high-risk actions (suspending a user, changing role permissions)
  require a sign-in within the last 15 minutes (brief §56).
- Provider-agnostic email (`src/lib/email.ts`) — Resend wired up via plain `fetch` (no SDK
  dependency), console-log fallback in dev when no provider is configured.
- Prisma-CLI-bundled agent skill docs (`.agents/skills/`, installed at Phase 0) were actually
  used here — Prisma 7's driver-adapter pattern and Next.js 16's `proxy.ts` rename both differ
  from what pre-2026 training data would assume, and both were caught by reading the real docs
  instead of guessing.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Full real login flow driven end-to-end with Playwright against a real (local) database: seed
  → password step → OTP read from the dev-console log → verified → redirected to `/admin`.
  Screenshotted every step, not just asserted status codes.
- RBAC actually tested, not just written: created a Central Admin user through the real UI,
  logged in as them, confirmed `/admin/users` and `/admin/roles` correctly render "You don't
  have access to this" (`ForbiddenError` from `requirePermission`) while `/admin/activity`
  (their granted permission) loads normally. Screenshotted.
- Confirmed unauthenticated `curl` to `/admin` redirects to `/admin/login?from=%2Fadmin`.
- Confirmed the audit log actually captures the full real sequence (otp_requested,
  login_success, user.created, another login_success) — not just that the table exists.
- Caught and fixed a real near-miss: `npm install prisma` / `create-next-app` pulled a Prisma 8
  release-candidate with 13 known vulnerabilities in Phase 0; a fresh `npm install prisma`
  during this phase would have repeated that if version weren't pinned — confirmed the pin
  held.
- Not yet verified: behavior against a real (non-local) Postgres instance; real email delivery
  (Resend path is written but untested — no API key yet); MFA/lockout behavior under concurrent
  requests; any load/rate-limit testing.

**Known issues / follow-ups:**
- Running against a local `prisma dev` database, not Neon — no real `DATABASE_URL` yet. Schema
  migrations are already tracked and will apply cleanly once one exists.
- Seeded Super Admin uses local-dev-only placeholder credentials
  (`SEED_SUPER_ADMIN_EMAIL`/`_PASSWORD` in `.env`) — replace with real founder credentials
  before this touches anything real.
- No real email provider configured — OTP codes currently only work because they're logged to
  the server console. This is fine for continued local development, not for staging.
- `/api/admin/auth/request-otp` has account-level lockout but no IP-based rate limiting —
  documented as an accepted gap for now in `docs/ARCHITECTURE.md`, worth revisiting before
  real traffic.
- Chapter Admin and Member roles exist as rows but have no working portal/scoping yet (Phase 3
  and Phase 11 respectively) — don't mistake their presence in the roles list for functionality.
- No password-reset flow yet (Super Admin can suspend/reactivate, but there's no self-service
  "forgot password" — reasonable to add whenever real admin users other than the seeded one
  exist and need it).

---

## Phase 3 — Chapters + Companies + Members + Categories

**Status:** Not started
