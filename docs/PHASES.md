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
- ~~No database is provisioned yet~~ **Resolved 2026-09-04** — see Phase 2 entry.
- Font pairing, component-primitive library, and real brand assets are undecided — see Open
  Decisions in `docs/ARCHITECTURE.md`. Phase 1 shouldn't start design work until at least fonts
  are picked.
- ~~Repo has not been pushed to a GitHub remote yet~~ **Resolved 2026-09-04**: pushed to
  `github.com/ezai130613-web/BWF` (the remote already existed from an earlier point; this just
  synced up commits that had accumulated locally since).
- ~~No CI configured yet (lint/typecheck/build-on-push)~~ **Resolved 2026-09-04**:
  `.github/workflows/ci.yml` runs `lint` and `typecheck` in parallel (no DB dependency) plus a
  `build` job against a disposable Postgres service container, migrated fresh each run — no
  secrets, never touches real Neon infra. First real run caught two genuine bugs: the
  migration-ordering issue recorded in Phase 2, and a `typecheck` failure on a truly clean
  checkout (`Cannot find name 'LayoutProps'` — a Next.js-generated ambient type that only existed
  locally because of a stale `.next/` directory). Fixed by changing the `typecheck` script to
  `next typegen && tsc --noEmit`. All three jobs are green as of commit `9796daa`.

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
- ~~No real photography — every image slot is a placeholder.~~ **Resolved 2026-09-04.** Member,
  Blog, and Event photo slots (`Member.photoUrl`, `Blog.featuredImageUrl`, `Event.imageUrl`) had
  admin form fields since their respective phases but the public pages never read them — always
  rendering the placeholder regardless. Fixed via `<PhotoSlot>` (`src/components/ui/photo-slot.tsx`),
  which renders the real photo when an admin has supplied one and falls back to `MediaPlaceholder`
  otherwise — so those three get their photography through normal admin data entry going forward.
  Homepage (5 shots) and Chapters (2/chapter) have no per-record field — the user supplied real
  photography for all of these directly, now checked in under `public/images/` and wired via
  `next/image`/`<PhotoSlot>` with `unoptimized={false}` (same-origin, safe to run through Next's
  optimizer, unlike the admin-supplied arbitrary URLs above). Chapter photo mapping lives in
  `src/lib/chapters/photos.ts`, keyed by chapter slug — a new chapter simply has no entry until its
  photos are sourced, falling back to `MediaPlaceholder` automatically.
  **Real defect caught and fixed along the way**: the delivered Homepage Hero and all three Chapter
  Hero images turned out to be AI-generated composites with their own large headline text already
  baked into the photo (e.g. "Built on connections...", "CC1 / CHAPTER 1"), which visibly collided
  with the site's own live overlaid heading. Removed via a masked-inpaint pass (luminance
  thresholding to isolate the glyphs + a downsample/inpaint/upsample fill for the large lettering,
  since a direct `cv2.inpaint` left visible ghosting on regions that large) — not reflected in any
  committed script, a one-off image-editing pass on the 4 affected source files before they were
  optimized into `public/images/`. Verified by re-screenshotting all four pages after a full
  `.next` cache clear (Next's dev image optimizer caches by URL, not by source file content —
  overwriting a same-named file silently served stale cached bytes until the cache was cleared).
  A hero image sourced at 1672×941 (below the 3840×2160 the shot list asked for) also shipped as-is
  — usable, just softer than ideal if viewed at very large desktop widths.
- Chapter section shows 3 generic placeholder panels; becomes data-driven in Phase 3.
- Insights/Events sections are intentionally inert "coming soon" states until Phases 5/8 ship
  real content — don't mistake this for a bug.
- `/privacy` and `/terms` now render a full first-draft Privacy Policy / Terms & Conditions
  (2026-09-04), grounded in the platform's actual data model and integrations rather than generic
  boilerplate — see `src/components/legal/legal-page-shell.tsx`. Still explicitly marked as a
  draft on-page (with bracketed placeholders for entity name, jurisdiction, grievance officer,
  fee terms, and liability/indemnification boilerplate) and must not be treated as final until a
  real lawyer reviews it and fills in those placeholders — flagged in `docs/ARCHITECTURE.md` open
  decisions.
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
- ~~Running against a local `prisma dev` database, not Neon~~ **Resolved 2026-09-04**: real Neon
  project provisioned (region: AWS Asia Pacific/Singapore), with separate `dev`/`staging`/`main`
  (production) branches per `docs/ARCHITECTURE.md`'s environment split. Local `.env` now points at
  the `dev` branch. Applying migrations via `prisma migrate deploy` to a real, empty Postgres
  surfaced a genuine bug the local dev database's history had masked: migration
  `20260903095736_phase14_indexes_rate_limit` created indexes on `blogs`/`events`/
  `membership_applications`/`testimonials`/`visitors` — tables that later migrations create, not
  earlier ones — so a clean replay failed with `relation "blogs" does not exist` partway through
  staging deploy. Fixed by trimming that migration back to only what could legitimately exist at
  that point (the new `rate_limit_hits` table + `members` indexes) and moving the rest into a new
  migration, `20260903235600_blogs_events_visitors_indexes`, ordered after the migrations that
  create those tables. All three branches (`dev`, `staging`, `main`) now apply cleanly from empty
  via `prisma migrate deploy`.
- ~~Seeded Super Admin uses local-dev-only placeholder credentials~~ — **Resolved 2026-09-06**
  (backlog #6): real founder Super Admin account created (`abiramanathank1@gmail.com`), plus two
  real Central Admin accounts for day-to-day data entry (`arasubwf1@gmail.com`,
  `buildersworldforum1@gmail.com`) — Central Admin was chosen over Chapter Admin since the two
  aren't scoped to one chapter. The old placeholder (`admin@bwf.local`) was suspended rather than
  deleted, keeping its audit-log history intact while its password no longer works.
  `SEED_SUPER_ADMIN_EMAIL`/`_NAME`/`_PASSWORD` in local `.env` updated to match, so a future
  reseed of an empty database creates the real account, not the placeholder.
  **Real regression caught and fixed 2026-09-06, while auditing for backlog #30** (leftover test
  data): a Playwright verification script written for this same item had a button-selector bug
  (`page.click('button[type="submit"]')` matched the *first* matching button on `/admin/users` —
  the Suspend/Reactivate toggle for the table's first row, not the create-user form's own submit
  button, since `admin@bwf.local` sorts first by `createdAt`) that silently flipped the placeholder
  account's status 3 times across 2 broken script runs before the selector was fixed, leaving it
  **Active** instead of the intended **Suspended** for roughly 20 minutes. Caught only by directly
  querying the database rather than trusting the earlier "suspended" confirmation message from
  memory. `lastLoginAt` confirmed no login happened during that window — no actual account misuse,
  just a real gap between "I did X" and "X is still true." Re-suspended immediately.
- ~~No real email provider configured~~ — **Partially resolved** (backlog #7): a real Resend
  account and API key were wired up 2026-09-04. Still sends from Resend's shared
  `onboarding@resend.dev` test address, not a real BWF domain — **2026-09-06**: registered
  `buildersworldforum.com` with Resend via its Domains API and got back the 3 DNS records it needs
  (DKIM TXT, SPF TXT, and an MX record) to verify the domain, but adding them requires DNS access
  at GoDaddy (where the domain's nameservers currently point), which the user doesn't have yet —
  it sits with the previous website developer. Blocked until that access is obtained; `EMAIL_FROM_ADDRESS`
  stays on the shared test address until the domain actually verifies.
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

**Status:** Complete

**What shipped:**
- Schema: `Chapter`, `Category`, `Company`, `Member`, `ChapterLeadershipRole`,
  `ChapterLeadership`, plus `UserRole.chapterId` for Chapter Admin scoping. `MemberProfile`
  deliberately not split out yet — see the schema's header comment for why. Full rationale in
  `docs/ARCHITECTURE.md`.
- Category exclusivity (brief §15) enforced by a real database unique constraint
  (`Member.activeSlotKey`), not just a form check — see `src/lib/members/slot.ts`.
- Chapter Admin scoping actually wired in, not just modeled: `requireChapterAccess()` /
  `getChapterScope()` gate the Members admin page so a Chapter Admin only sees/edits their own
  chapter, while Super/Central Admin see everything. Admin login now accepts Chapter Admin
  (previously Super/Central only), and `/admin/users` can create one with a chapter assignment.
- Admin CRUD: `/admin/chapters` (+ `/admin/chapters/[id]` for details, meeting info, and
  leadership assignment), `/admin/companies`, `/admin/categories`, `/admin/members`. Sidebar nav
  is now permission-aware — a Chapter Admin only sees Dashboard + Members.
- Public site now data-driven instead of hardcoded: `/chapters` (list of ACTIVE chapters),
  `/chapters/[slug]` (description, leadership, member list, available categories computed live,
  meeting info), and the homepage's Chapters/Find-a-Professional sections now query the
  database instead of the Phase 1 static arrays. Draft chapters stay internal (brief §16) —
  only `status: ACTIVE` chapters appear publicly.
- Seeded reference data: 3 placeholder chapters (Chennai), a 10-category starter taxonomy
  grounded in the brief's own examples, 4 leadership role types. All admin-editable, none
  fabricated as if final — see `docs/ARCHITECTURE.md` open decisions.
- New permissions (`chapters:manage`, `categories:manage`, `companies:manage`,
  `members:manage`) — Super Admin gets all, Central Admin gets all of these per brief §10,
  Chapter Admin gets none globally (scoped instead, see above).

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- **Actually tried to break the category-exclusivity rule**, not just trusted the schema:
  created a member (Ravi Kumar, Architect, Chapter 01) through the real admin UI, then tried to
  create a second Architect in the same chapter — got "This category is already occupied by an
  active member in this chapter," rejected at the database layer. Screenshotted. This was
  attempted through the real UI, not typed directly against the database.
- Verified the full vertical slice end-to-end through a browser: created a company, edited a
  chapter's description/meeting info, assigned a member to a leadership role, then confirmed
  all of it — description, leadership, member list, and the *correctly-filtered* available-
  categories list (missing "Architect," present everything else) — rendered on the real public
  `/chapters/chapter-01` page. Screenshotted.
- Confirmed the homepage and `/chapters` list pull live data (real seeded chapter/category
  names), not the old hardcoded placeholders.
- Hit a real local-database incident mid-phase (Prisma's local dev shadow-database got stuck)
  and resolved it without any destructive operation — full account in
  `docs/ARCHITECTURE.md`'s "Local dev database operational note."
- **Chapter Admin scoping actually tested**, not just modeled: created a member in Chapter 02,
  created a Chapter Admin scoped to Chapter 02, logged in as them, and confirmed their sidebar
  shows only Dashboard + Members, their Members list shows *only* Chapter 02's member (not
  Chapter 01's Ravi Kumar), and `/admin/chapters` renders "You don't have access to this —
  Missing permission: chapters:manage." Screenshotted, same rigor as Phase 2's Central-Admin
  RBAC test.
- Not yet verified: behavior against a real (non-local) Postgres/Neon instance; concurrent-
  write race conditions on the exclusivity constraint (the DB constraint should hold regardless
  under Postgres's own transaction isolation, but this wasn't specifically load-tested).

**Known issues / follow-ups:**
- Two duplicate "Acme Construction Pvt Ltd" company rows exist in the local dev database from
  repeated test runs (Company has no unique-name constraint, unlike Chapter/Category) —
  harmless local test data, not a schema bug, but worth a manual cleanup or a
  `db.company.deleteMany()` before any demo.
- ~~No admin UI to add a *new* leadership role type~~ — **Resolved 2026-09-04** at
  `/admin/leadership-roles`, see `docs/ARCHITECTURE.md`.
- ~~Object storage still isn't wired up~~ — **Resolved 2026-09-04** (backlog #8): real Cloudflare
  R2 + presigned-upload UI now covers every media field including Company logo — see
  `docs/ARCHITECTURE.md`'s Member section and Phase 9's follow-up entry below.
- Individual public member profile pages and the member-directory search are explicitly Phase 4
  — the chapter detail page lists members inline but doesn't link to a profile page yet.

---

## Phase 4 — Member Directory + Individual Member Profiles + Search

**Status:** Complete

**What shipped:**
- Extended `Member` with the brief's §19 public-profile fields — services, specialisations,
  USP, years in business, areas served, certifications, major projects, clientele, contact
  (whatsapp/website/address/maps), social (Instagram/LinkedIn/Facebook), and media URL fields
  (photo/brochure/video). Added `Member.slug` (unique, generated once at creation, stable
  afterward). Full rationale in `docs/ARCHITECTURE.md`.
- Migration handled the "add a required unique column to a table with existing rows" case
  properly: nullable add → backfill real slugs from existing member names → `NOT NULL` →
  unique index, rather than just deleting the test data to dodge the problem. Same shadow-DB
  workaround from Phase 3 was needed again (documented there, reused without fuss here).
- `/admin/members/[id]` — full profile edit page (grouped into Personal / Business profile /
  Contact / Social & media sections), linked from the Members list.
- Public `/members` — searchable directory: keyword search (name/company/services/
  specialisations via Postgres `ILIKE`), chapter filter, category filter, results grouped
  chapter-wise per brief §18, all via plain URL query params (works without client JS, shareable
  links).
- Public `/members/[slug]` — full individual profile page per brief §19: hero, about, services,
  specialisations, USP, years/areas/certifications, major projects, clientele, contact card,
  social card, media links, leadership badge if applicable, link back to their chapter.
- Chapter detail pages now link each member to their real profile instead of a plain div.
- Revalidation extended to cover `/members` and `/members/[slug]` on every member mutation.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Filled in a real member's full profile through the actual admin edit form (bio, services,
  specialisations, USP, years in business, areas served, certifications, WhatsApp, website,
  LinkedIn) and confirmed every field rendered correctly on their live public profile page —
  not just that the save succeeded. Screenshotted.
- Confirmed the directory groups by chapter correctly with two members across two chapters, and
  that keyword search ("sustainable") correctly returns only the matching member and excludes
  the other — proving the search actually filters, not just that the UI renders.
- Caught my own test-script mistake mid-verification (edited the wrong member because the list
  sorts newest-first) — worth noting only because it confirms the admin list's sort order is
  working as coded, and the actual save/render pipeline was never in doubt once pointed at the
  right record.
- Not yet verified: real photo/logo/video media (no object storage yet, so no upload was
  possible to test — only URL text fields were exercised); behavior with a large member count
  (search/filter tested with 2 members, not load-tested).

**Known issues / follow-ups:**
- ~~No photo/brochure/video upload UI~~ — **Resolved 2026-09-04**, see `docs/ARCHITECTURE.md`.
- Programmatic SEO landing pages (brief §52) deliberately deferred — see
  `docs/ARCHITECTURE.md`.
- ~~Directory search has no pagination~~ — **Resolved 2026-09-04** (backlog #10), see
  `docs/ARCHITECTURE.md`.
- No structured data (Person/LocalBusiness schema) on profile pages yet — that's explicitly
  Phase 10's job (brief §53), not skipped by oversight.

---

## Phase 5 — Blogs + SEO/AEO/GEO + Author System

**Status:** Complete

**What shipped:**
- Schema: `Author` (distinct from `Member`, optional 1:1 link), `BlogCategory`, `BlogTag`,
  `Blog` (status workflow, FAQ, full SEO/OG field set). Full rationale — especially the
  content-trust boundary that matters a lot once Phase 11 adds member self-submission — in
  `docs/ARCHITECTURE.md`.
- Full admin CMS: `/admin/blogs` (list + minimal-fields create, matching the "avoid
  unnecessarily large forms at first interaction" pattern used elsewhere), `/admin/blogs/[id]`
  (everything else — Markdown content, excerpt, tags, featured image, FAQ builder, full SEO/OG
  fields, status/scheduling), `/admin/blog-categories`, `/admin/authors`.
- Status workflow: Draft / Scheduled / Published / Unpublished / Archived. Archiving is a soft
  delete (brief §43) — there's no hard-delete button in the UI. `publishedAt` is set once, the
  first time a post ever goes live, and never reset by later edits — so "published" and
  "updated" dates stay meaningfully different.
- Scheduling needs no cron job — a `SCHEDULED` post becomes visible once `scheduledAt` passes,
  checked lazily at read time. Full mechanism in `docs/ARCHITECTURE.md`.
- Public `/insights` (category-filterable listing), `/insights/[slug]` (full post — rendered
  Markdown, FAQ section, tags, related-posts-by-category, author byline), `/authors/[slug]`
  (bio + their published posts, links back to a member profile when linked). Homepage's
  Insights section now shows real published posts (or an honest empty state) instead of
  Phase 1's "coming soon."
- Article + FAQPage JSON-LD structured data on post pages — brought forward into this phase
  rather than deferred to Phase 10, since brief §29 calls it out as part of the blog's own
  SEO/AEO/GEO architecture specifically (see `docs/ARCHITECTURE.md` for how that's distinguished
  from §53's more general, still-Phase-10 schema work).
- `@tailwindcss/typography` added for rendering Markdown content with the site's own dark
  editorial styling (`prose prose-invert`) rather than unstyled HTML.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Created a real post through the actual admin UI — title, excerpt, multi-heading Markdown
  body with a bulleted list, three tags, SEO title, meta description, one FAQ entry — and
  confirmed it correctly does **not** appear on the public `/insights` list while still
  `DRAFT`. Screenshotted.
- Published it, then confirmed: it appears on `/insights`, the individual post page renders the
  Markdown correctly (headings, list, paragraphs via the typography plugin), the FAQ section
  renders, both `Article` and `FAQPage` JSON-LD are present in the page source with the actual
  entered content (not placeholders) — read back and diffed against what was typed in, not just
  "a script tag exists." Screenshotted.
- Confirmed the author byline links to a working `/authors/[slug]` page listing that post, and
  that the homepage's Insights section now shows the real published post.
- Caught my own test-script bug mid-run (navigated away from the edit page and forgot to
  navigate back before trying to publish) — same category of mistake as Phase 3's, worth
  naming again only because both times the actual app behavior was correct once the test
  pointed at the right thing.

**Known issues / follow-ups:**
- Content editing is a plain Markdown textarea, not a WYSIWYG editor — deliberate scope call,
  not a gap; brief doesn't demand rich-text editing and adding one (TipTap/ProseMirror etc.)
  would be a meaningful dependency for a "nice to have."
- No image upload for featured/OG images — URL fields only, same pending-storage pattern as
  Company/Member media.
- **Real risk flagged for later, not now**: `Blog.content` is rendered without HTML
  sanitization because it's trusted admin content today. The moment Phase 11 lets a member's
  own submission reach `PUBLISHED` without a human admin explicitly reviewing it first, that
  trust boundary needs revisiting (sanitize, or keep a hard admin-approval gate — brief §31
  already describes the latter, so as long as that workflow is respected this stays safe).
- Programmatic SEO landing pages (brief §52) still deferred — noted again in
  `docs/ARCHITECTURE.md`, not forgotten, just still without a clean phase home.
- One duplicate-titled test post was left in the local dev database from a re-run during
  verification (draft, never published) — harmless, same category as Phase 3's duplicate
  company row.

---

## Phase 6 — Testimonials + Feedback + Website Content CMS

**Status:** Complete

**What shipped:**
- Schema: `Testimonial` (5 types, Pending/Approved/Rejected, consent, featured flag, optional
  chapter link), `Feedback` (4 types, no status workflow — it's never published, just captured),
  `WebsiteContent` (named key-value copy blocks), `SiteFaq`. Full rationale — especially the
  three different visibility models living in one phase — in `docs/ARCHITECTURE.md`.
- Testimonials: public submission (`/testimonials`, always lands Pending) and direct admin
  entry (`/admin/testimonials`, publishes immediately per brief §33) both require an explicit,
  never-pre-checked consent checkbox. Admin can approve/reject pending submissions and toggle a
  featured flag. Approved testimonials now appear on `/testimonials`, the homepage (featured
  only), and their linked chapter's page.
- Feedback: public form at `/feedback`, admin view at `/admin/feedback` gated behind
  `feedback:view` — granted **only** to Super Admin, deliberately excluded from Central Admin's
  otherwise-broad permission set, matching brief §34 exactly.
- Website Content CMS: `/admin/content`, grouped by section, each block a simple
  textarea-plus-save. Wired up for real on Footer (tagline + contact info) and the About page
  (intro paragraph) — a deliberately small, representative slice rather than converting every
  page, per brief §62's own warning against making "every pixel editable."
- FAQs: `/admin/faqs` (add + show/hide, ordered) and a public `/faqs` page with FAQPage
  structured data — same JSON-LD pattern established in Phase 5.
- Moved two Server Actions (`submitTestimonial`, `submitFeedback`) out of the admin route
  folders into their public counterparts after noticing they'd been written alongside
  permission-gated admin mutations by convenience rather than by correctness — noted in
  `docs/ARCHITECTURE.md` as a pattern to remember for future public-submission features.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Submitted a real testimonial through the public form (not logged in) and confirmed it does
  **not** appear on `/testimonials` while Pending. Approved and featured it as Super Admin,
  then confirmed it now appears on `/testimonials`, and on the homepage. Screenshotted every
  step.
- Submitted real feedback through the public form, confirmed it appears in `/admin/feedback` as
  Super Admin — then logged in as a **Central Admin** and confirmed they're cleanly blocked
  ("Missing permission: feedback:view") while still correctly seeing Testimonials/Content/FAQs
  in their sidebar. This is the phase's one genuinely distinctive rule (brief §34), so it got
  the same login-and-verify treatment as Phase 2/3's RBAC tests, not just a seed-file read.
- Edited `about.intro` through `/admin/content` and confirmed the real public `/about` page
  rendered the new copy — proving the content-block mechanism actually works end-to-end, not
  just that the admin form saves.
- Added a real FAQ through `/admin/faqs` and confirmed it rendered on the public `/faqs` page.
- Had to recreate the Phase 3 Central Admin test account (`central@bwf.local`) since the local
  database it lived in was replaced during Phase 3's shadow-DB incident — not a new issue, just
  a reminder that local test accounts don't survive a database swap.

**Known issues / follow-ups:**
- No image upload for testimonial photos — URL field only, same pending-storage pattern as
  Company/Member/Blog media.
- Website Content CMS covers a deliberately small set of fields (footer, contact, about intro).
  Extending it to more sections (leadership bios, additional homepage copy) is a low-effort
  follow-up whenever BWF actually wants a specific block editable — the mechanism doesn't need
  to change, just the seed list and one `getContent()` call per new field.
- Some pages that read content blocks or chapter lists (e.g. `/feedback`'s chapter dropdown)
  aren't covered by the same broad revalidation as testimonials/content/FAQs — a brand-new
  chapter might not appear there until the next full rebuild. Minor staleness, not a
  correctness bug (submission still works), not chased down further this phase.

---

## Phase 7 — Membership Application + Category Availability + Waiting List

**Status:** Complete

**What shipped:**
- Schema: `MembershipApplication` — full status workflow (New → Under Review → Contacted →
  Meeting Scheduled → Approved in Principle → Waiting for Payment → Paid → Rejected /
  Waitlisted per brief §17), optional chapter (null = waiting list), and a `convertedMemberId`
  link recording the Visitor→Applicant→Member lineage once converted.
- `getChapterAvailability()` (`src/lib/applications/availability.ts`) — the same availability
  check both the public apply wizard and (implicitly, by sharing the underlying data) the
  exclusivity constraint agree on. Full rationale in `docs/ARCHITECTURE.md`.
- Public `/apply` — a real multi-step wizard (category → live availability per chapter →
  available-chapter selection or waiting-list → basic details form), matching brief §17's exact
  step sequence and its explicit "avoid unnecessarily large forms at first interaction"
  guidance. Server-revalidates availability on submit rather than trusting stale client state.
- Admin `/admin/applications` (list) and `/admin/applications/[id]` (status control, internal
  notes, waiting-list chapter reassignment — including to `DRAFT`/internal chapters per
  brief §16 — and the conversion step). Conversion is a single explicit admin action; approval
  or payment status alone never auto-creates a member (brief §17 step 7).
- New `applications:manage` permission, Super + Central Admin per the established pattern.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Ran the entire lifecycle for real, repeatedly, through the actual UI: submitted applications
  as an anonymous visitor, watched available-chapter count correctly drop from 2 → 1 → 0 as
  admin converted each one to a real Member, confirmed the "Currently unavailable in existing
  chapters" + waiting-list UI appears with the brief's exact wording only once every chapter is
  genuinely full, submitted a waitlisted application and confirmed it saved with `chapterId:
  null` / `status: WAITLISTED`, then — as admin — created a brand-new chapter and assigned the
  waitlisted applicant to it, watching the "assign a chapter" panel correctly disappear once
  assigned. Screenshotted every stage.
- **Found and confirmed a real edge case along the way, not by design**: converting an
  application into a category+chapter slot that had since been filled by another conversion
  correctly failed with the same `SLOT_TAKEN_ERROR` the exclusivity constraint uses elsewhere —
  discovered because leftover test applications from an earlier (buggy) test run all happened
  to target the same already-filled chapter. Worth recording because it's exactly the kind of
  race condition the database-level constraint exists to prevent, and it held.
- Hit real test-script flakiness twice this phase (re-logging in without signing out first hit
  the same already-authenticated redirect Phase 3 hit; then too-short waits after the
  conversion action caused "destination stream closed early" and made a working feature look
  broken). Both traced to the test harness, not the app, by re-running the same action in
  isolation with generous waits and full error surfacing before concluding either way — worth
  remembering as the standard move when a Playwright script's result looks suspicious: isolate
  and slow down before assuming the app is wrong.

**Known issues / follow-ups:**
- ~~`convertApplicationToMember`'s error path (slot already taken) surfaces via the admin
  route's generic error boundary~~ — **Resolved 2026-09-04** (backlog #11), see
  `docs/ARCHITECTURE.md`.
- ~~Company matching on conversion is exact-name-only, no fuzzy dedup~~ — **Resolved
  2026-09-04** (backlog #12), see `docs/ARCHITECTURE.md`.
- No application-related emails yet (confirmation to applicant, notification to admin) —
  that's explicitly Phase 13's job, not an oversight here.
- Left a handful of test "Karthik Architect ..." applications and members in the local database
  from verification — harmless, same category as prior phases' test-data leftovers.

---

## Phase 8 — Visitor Registration + Meetings + Events

**Status:** Complete

**What shipped:**
- Schema: `Meeting` (chapter-scoped, `MeetingStatus`), `Event` (nullable `chapterId` — "Chapter
  or Global" per brief §26, unique `slug`, `EventType`, `EventStatus`, optional `capacity` and
  `registrationDeadline`), `Visitor` (`VisitorStatus` covering the full brief §23-25 pipeline:
  Registered → Attended → Follow-up Required → Interested in Membership → Application
  Submitted → Converted / Not Interested). Deliberately one `Visitor` row per registration
  rather than a split Visitor+VisitorRegistration pair — same simplicity call as
  Member/MemberProfile in Phase 3; rationale recorded as a schema comment, revisit only if
  repeat-visitor deduplication becomes a real requirement.
- Admin `/admin/meetings` (list + create, chapter-scoped) and `/admin/meetings/[id]` (edit +
  the meeting's registered-visitor roster). New `meetings:manage` permission, scoped via
  `requireChapterAccess()` exactly like `members:manage` — Chapter Admin gets no blanket grant,
  only access to their own chapter's meetings (see `prisma/seed.ts`).
- Admin `/admin/events` (list + create, chapter-or-global) and `/admin/events/[id]` (edit +
  registered-visitor roster). New `events:manage` permission. Because `Event.chapterId` can be
  null, access control needed a variant: `requireEventAccess()`
  (`src/app/admin/(dashboard)/events/actions.ts`) uses `requireChapterAccess()` when the event
  has a chapter and falls back to a plain `requirePermission("events:manage")` check for global
  events — which a Chapter Admin can never pass, since they hold no blanket permission.
- Admin `/admin/visitors` (list, chapter-scoped) and `/admin/visitors/[id]` (status control,
  internal notes, and a link to the referring member if one was recorded). New
  `visitors:manage` permission, same chapter-scoping pattern.
- Public visitor registration: a shared `registerVisitor` server action
  (`src/app/(public)/visit/actions.ts`) and `<VisitorRegisterForm>` component used from two
  entry points — `/visit/[meetingId]` (linked from each chapter's "Upcoming meetings" panel,
  chapter fixed to the meeting's own) and inline on `/events/[slug]` (chapter fixed if the
  event belongs to one, otherwise a chapter picker for global events). Re-validates
  server-side that registration is still open (meeting/event status, deadline, capacity) rather
  than trusting whatever the page last rendered — same discipline as `submitApplication` in
  Phase 7.
- Public `/events` (real listing, replacing the Phase 1 "coming soon" placeholder) and
  `/events/[slug]` (detail + registration, with a live "X / capacity registered" count).
  Chapter detail pages (`/chapters/[slug]`) gained an "Upcoming meetings" panel linking to the
  registration page for each.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities. One real ESLint
  catch worth noting: `react-hooks/purity` flagged a direct `Date.now()` call inside the
  `/events/[slug]` page component body (feeding into the "is registration closed" logic) as an
  impure read during render; fixed by moving that computation into a plain module-level
  function (`getEventAvailability`) called from the component rather than inlined in it.
- Ran the full lifecycle for real through the actual UI, logged in as Super Admin: created a
  chapter meeting, confirmed it appeared on the chapter's public page with a working "Register
  to visit" link, completed that registration as an anonymous visitor, confirmed it landed in
  `/admin/visitors` with the right category/chapter, then changed its status and saved notes
  and confirmed both persisted after a reload. Separately created a chapter-scoped event with a
  capacity of 50, confirmed it appeared on the public `/events` listing and detail page,
  registered a visitor against it, and confirmed the admin events list updated its count to
  "1 / 50" live.
- Chapter Admin RBAC scoping tested as a second, separate login (an existing Phase-3 test
  Chapter Admin account, `chapter02@bwf.local`): sidebar correctly shows Meetings/Events/
  Visitors (scoped exception, same pattern as Members) but not Chapters; `/admin/meetings` and
  `/admin/events` correctly showed zero of the other chapter's records and the create-form's
  chapter dropdown was pre-filtered to only that admin's own chapter; direct navigation to
  another chapter's meeting-edit URL correctly threw `ForbiddenError` rather than rendering the
  form.

**Known issues / follow-ups:**
- ~~Event capacity enforcement (`registerVisitor`'s count-then-create check) has the same
  theoretical race condition as any check-then-act without a transaction~~ — **Resolved
  2026-09-04** (backlog #13): a Serializable transaction now closes the race, verified live
  with 8 truly-concurrent submissions against a capacity-3 event (exactly 3 created, no
  overshoot). See `docs/ARCHITECTURE.md` — also surfaced an unrelated real bug along the way
  (an email-send failure in `notifyVisitorRegistered` crashes `registerVisitor` *after* the
  Visitor row already committed), deliberately left unfixed as out of scope for this item.
  **Resolved 2026-09-06** (backlog #35): wrapped every `notify*` call in
  `src/lib/notifications.ts` at its 7 call sites (visitor registration, membership application
  submission, application status change, member profile-revision review, member article
  submission, and both article-review actions) in try/catch — a failed notification email now
  logs and moves on instead of throwing, since the real state change it's reporting on is always
  already committed by that point. `recordLead()` didn't need the same fix — it already swallowed
  its own errors (see its own doc comment). Verified live, not just read: temporarily broke
  `EMAIL_API_KEY` in `.env`, submitted two real visitor registrations through the actual public
  `/events/[slug]` form, confirmed both succeeded with the real "thanks for registering" message
  and a real `Visitor` row each, while the server log showed the genuine Resend 401 being caught
  and logged rather than crashing the request. Restored the real key and cleaned up test data
  afterward.
- ~~`ForbiddenError` on a direct out-of-scope URL still surfaces as Next.js's generic 500 error
  page~~ — **Resolved 2026-09-04** (backlog #14): every RBAC check now uses `next/navigation`'s
  `forbidden()` + a `forbidden.tsx` screen instead. Verified against a real production build
  (`next build && next start`), not just dev mode — see `docs/ARCHITECTURE.md`'s RBAC section
  for why that distinction mattered here. Phase 7's version of this gap (the conversion error
  path) was a separate, form-level fix (backlog #11, `useActionState`).
- No visitor confirmation email or admin notification yet — Phase 13's job, consistent with
  every other "we'll wire up email later" note in this log.
- The admin dashboard home page (`/admin`) still doesn't surface any of the new counts (upcoming
  meetings, open event registrations, visitor follow-ups due) — it's been a placeholder since
  Phase 3 and stays that way until Phase 9's reporting work gives it real content.

---

## Phase 9 — Reporting + Excel/CSV/PDF Exports + Weekly Reports

**Status:** Complete

**What shipped:**
- The admin dashboard (`/admin`) now shows real operational metrics (brief §39) instead of the
  placeholder text that had been there since Phase 0: active members, total companies, active
  chapters, visitors, new visitors this month, membership applications, pending approvals,
  upcoming meetings, upcoming events, open category slots, blog activity, and recent admin
  activity (`src/lib/dashboard/metrics.ts`). Chapter Admin gets a materially smaller, chapter-
  scoped set (active members/visitors/meetings/events/open slots for their own chapter only) —
  not the full set pre-filtered, since several tiles (companies, applications, blog, audit log)
  sit outside anything a Chapter Admin can see anywhere else in this admin; showing a number for
  a domain they can't drill into would be a new inconsistency, not a summary. "New leads" from
  brief §39's own list is deliberately omitted — the Leads system (brief §35) has no phase of its
  own yet (see the Open Decisions table in `docs/ARCHITECTURE.md`), and this project's Phase-1-
  established convention is an honest gap over a fabricated number. The "Later:" metrics
  (business generated, referral count, attendance, renewals, website performance) are brief §72
  future work and weren't built early either.
- `/admin/exports` — the Weekly Member Export (brief §44) on demand, in CSV, Excel, or PDF
  (`src/lib/reports/member-export.ts`, using `exceljs` and `pdfkit`). Default columns are exactly
  the four required fields (Member Name, Category, Phone Number, Membership Status); an explicit,
  unchecked-by-default "include chapter & company columns" checkbox is the one way to get more —
  matching brief §44's "must not alter requested export unless selected" literally. Scoped per
  brief §45 via the existing `getChapterScope("exports:manage")` pattern: Chapter Admin is locked
  to their own chapter (no dropdown), Central/Super Admin get a chapter picker plus an "All
  chapters (master export)" option. The actual file-generation route
  (`/api/admin/exports/members`) re-derives scope from the session server-side rather than
  trusting the `chapterId` query param the page last rendered — same discipline as
  `registerVisitor`/`submitApplication` elsewhere in this app.
- `/admin/reports` — Weekly Report configuration (brief §46): admin-editable recipients (email +
  either "Master" or one specific chapter) and a send-day schedule, stored in
  `WeeklyReportRecipient`/`WeeklyReportSettings`. Central/Super Admin only — brief §45 only ever
  gives Chapter Admin a role in *exporting* their own chapter, never in configuring who receives
  the automated report, so this page uses a separate `reports:manage` permission (blanket-only,
  not chapter-scoped) rather than reusing `exports:manage`.
- Two new permissions: `exports:manage` (Super/Central blanket, Chapter Admin via chapter scoping
  — same pattern as `members:manage`) and `reports:manage` (Super/Central blanket only).
- **Deliberately not built**: brief §46 says the weekly report "should eventually automatically
  generate and email" itself — the automatic sending part is left for Phase 13 (Email/
  Notification Automation), matching this project's own established precedent: Phase 7's
  application confirmation emails and Phase 8's visitor confirmation emails were both explicitly
  deferred to Phase 13 too, even though (like this one) they were closely tied to the phase that
  introduced the underlying data. What Phase 9 delivers is everything Phase 13 needs to wire a
  sender onto without a schema change: real recipients, a real schedule, and the exact export
  engine that would produce the attachment.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities. `exceljs` pulled in
  a vulnerable transitive `uuid@8` (moderate, buffer-bounds-check advisory) — overridden to
  `uuid@^11.1.1` in `package.json` (same pattern as Phase 0's `mysql2`/`deepmerge-ts` overrides),
  confirmed clean afterward.
- Hit the same local shadow-database issue documented in `docs/ARCHITECTURE.md` from Phase 3
  (`migrate dev` failing with "type already exists" against the shadow DB) on this phase's first
  migration attempt — resolved with the exact same non-destructive documented recipe (`migrate
  diff` → `db execute` → `migrate resolve --applied`), no data loss, no destructive command used.
- Logged in as Super Admin through the real UI and confirmed the dashboard's numbers against the
  actual seeded/test data (4 active members, 6 companies, 3 active chapters, 8 applications with
  6 pending, etc.) — not just that the tiles render. Downloaded all three export formats for
  real: CSV content read back and diffed against the four expected columns, the Excel file
  opened as a valid non-empty `.xlsx` (6.7KB, correct header row), the PDF started with a valid
  `%PDF-` header. Added one master-scoped and one chapter-scoped recipient and changed the
  schedule through the real `/admin/reports` UI, then confirmed the actual database rows (not
  just the rendered page) reflected the change — a stale `<select>` in the post-submit screenshot
  turned out to be a client-render artifact (React `defaultValue` doesn't resync on a server
  component re-render without a remount), not a save failure; caught by checking the database
  directly instead of trusting the screenshot, the same "isolate before concluding the app is
  wrong" discipline Phase 7 established.
- **Actually tried to break the export scoping**, not just trusted the code: created a fresh
  Chapter Admin test account through the real `/admin/users` UI, scoped to Chapter 01, and
  confirmed — logged in as them — that their sidebar shows Exports but not Reports; their
  dashboard shows only Chapter 01's numbers; their Exports page has no chapter dropdown; their
  CSV download contains only Chapter 01's one member; direct navigation to `/admin/reports`
  correctly throws `ForbiddenError` ("Missing permission: reports:manage"); and — the actual
  attack this matters for — hand-crafting a request to
  `/api/admin/exports/members?format=csv&chapterId=all` while authenticated as that Chapter Admin
  still returned only Chapter 01's data, proving the route ignores the spoofed query param and
  re-derives scope from the session, not the URL.
- One transient failure during testing: the very first request to the two brand-new tables
  (`weekly_report_recipients`, `weekly_report_settings`) threw a Postgres wire-protocol error
  ("bind message supplies 1 parameters, but prepared statement requires 0") from inside a
  three-way `Promise.all`. Reproduced-and-isolated per the Phase 7/8 standard: five consecutive
  reloads afterward all succeeded, so this was cold-connection flakiness in the local `prisma
  dev` proxy, not a logic bug — but the write (a settings-row `upsert`) was pulled out of the
  `Promise.all` and awaited separately anyway, since mixing a write with unrelated reads in one
  batch was avoidable regardless of whether it caused this specific failure.
- Not yet verified: real email delivery of a weekly report (deliberately not built this phase —
  see above); behavior against a real (non-local) Postgres instance; PDF/Excel rendering with a
  much larger member count than the ~4 in local test data (pagination in the PDF path is written
  but only exercised by a small table so far).

**Known issues / follow-ups:**
- Weekly report sending is configured but inert — `WeeklyReportSettings.isEnabled` has no effect
  until Phase 13 wires an actual sender on top of `WeeklyReportRecipient`/the export engine. Not
  an oversight; see "Deliberately not built" above.
- `exceljs`'s own `uuid@8` dependency is overridden rather than upgraded upstream — revisit if a
  future `exceljs` release drops the vulnerable transitive dependency on its own, at which point
  the override in `package.json` can be removed. **Re-checked 2026-09-06 (backlog #15), still
  blocked**: exceljs's latest stable (`4.4.0`) is unchanged, and even its newest prerelease
  (`4.4.1-prerelease.0`) still declares `uuid: ^8.3.0` — nothing upstream to drop the override
  for yet. `npm audit` still clean (0 vulnerabilities) with the override in place.
- ~~The PDF export's table layout is hand-drawn (no table-layout library) — correct and
  paginating for the data volumes tested, but only lightly exercised~~ — **Re-checked and fixed
  2026-09-06** (backlog #16): a real 500-row export with genuinely long values (not the ~4-row
  smoke test above) surfaced three real, related layout bugs — fixed row height not accounting
  for wrapped cell content (silent row overlap), zero inter-column gutter (adjacent columns'
  text touching), and the header's own height having the same fixed-height bug once the gutter
  fix pushed a header label into wrapping. See `docs/ARCHITECTURE.md` for the fix and how it was
  verified (actual page renders, not just re-reading the code).
- A `phase9-chapter-admin@bwf.local` Chapter Admin test account (Chapter 01) was created during
  verification and left in the local database — harmless test data, same category as prior
  phases' leftover test rows (Phase 3's duplicate company, Phase 7's "Karthik Architect"
  applications).
- Leads (brief §35) still has no phase of its own in the brief's own Phase Structure table — the
  dashboard's "New leads" tile stays absent until one exists; flagged again here since Phase 9
  was the most natural place to have noticed this gap.

---

## Phase 10 — Analytics + Search Console + Technical SEO + Schema

**Status:** Complete

**What shipped:**
- GA4 (`src/components/analytics/google-analytics.tsx`) and Google Search Console verification
  (Next's built-in `metadata.verification.google`), both gated on
  `NEXT_PUBLIC_GA4_MEASUREMENT_ID`/`NEXT_PUBLIC_GSC_VERIFICATION` — render nothing until set,
  same "no dead script/tag ships" rule as Phase 1's `WhatsAppCta`. Scoped to the public surface
  only (`(public)/layout.tsx`), not admin/member — brief §50's whole analytics section is about
  the public marketing site, and there's no reason to ship public tracking scripts alongside
  internal admin usage.
- `src/lib/analytics.ts` (`trackEvent()`) — a thin, no-op-safe wrapper around `gtag`. Wired up at
  the touchpoints brief §50 names as custom events: `become_member_click` (hero, header
  desktop/mobile, the homepage's oversized-typography CTA, and each chapter page's Apply button),
  `whatsapp_click` (the floating CTA), `member_contact_click` (a member profile's
  phone/WhatsApp/email/website/maps links — this also covers brief §50's separately-named
  "Profile enquiries", which has no other concrete definition than "someone tried to contact this
  member"), `visitor_registration` / `event_registration` (the shared visitor-registration form
  fires one or the other depending on whether it's registering for an event or a plain chapter
  meeting), `membership_application_submitted`, and `member_directory_search` (see below for why
  this is one event, not brief §50's two). "Blog performance" and "Member page views" need no
  custom code — GA4's own automatic pageview tracking already covers per-URL views once the base
  script is present. Two small client wrapper components (`TrackedAnchor`, `TrackedButton`)
  exist only because a Server Component can't pass a function prop to a Client Component — each
  defines its `onClick` internally rather than receiving one from its server-rendered parent.
- `src/app/sitemap.ts` and `src/app/robots.ts` (Next's native file conventions) — sitemap covers
  every static route plus live chapter/member/blog/event/author slugs and every programmatic
  landing page slug (see below); robots disallows `/admin`, `/member`, `/api`.
- Structured data (brief §53) added on top of Phase 5's existing Article/FAQPage: `Organization`
  site-wide, `LocalBusiness` on member profiles (a directory listing — address, phone, service
  area — reads as a business more than a personal bio), `Person` on author pages (genuinely a
  bio), `Event` on event detail pages, and `BreadcrumbList` on every nested detail page (chapters,
  members, insights, events, authors — two-level for authors, since there's no `/authors` index
  page to link an honest third crumb to). A shared `<JsonLd>` component
  (`src/components/seo/json-ld.tsx`) replaces the inline `<script>` boilerplate Phase 5
  established once there were enough new call sites (6) that repeating it stopped being simpler.
- Programmatic SEO (brief §52) — `/architects-in-chennai`-style landing pages for every (active
  category) × (distinct active-chapter location) combination, computed live from the database
  (`src/lib/seo/programmatic.ts`), not a hardcoded list — a single dynamic `[slug]` route at the
  public root, rendered on demand (no `generateStaticParams`, matching every other slug-based
  detail route in this app). A category name is pluralized via a small hand-rolled heuristic
  (`src/lib/seo/pluralize.ts`) rather than a library — three rules cover every category in the
  current seed list, and categories are admin-editable free text so a lookup table wasn't an
  option anyway. `docs/ARCHITECTURE.md`'s Phase 4 note already earmarked this for "Phase 5 or
  Phase 10, whichever fits better" — Phase 5 passed on it, so this is that commitment being kept,
  not new scope invented mid-phase.
- `NEXT_PUBLIC_SITE_URL` (`src/lib/site.ts`) — the real public domain is still an open decision
  (see below), so this defaults to `http://localhost:3000` until it's set; used for
  `metadataBase`, the sitemap, and every absolute URL in JSON-LD.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- **Hit real, reproducible build failures and root-caused them rather than just retrying until
  green.** `next build` initially failed consistently (5 build attempts, always at the same
  "10/43" progress point, always inside the Footer's `getContent()` call, on a different page
  each time) with `DriverAdapterError: ConnectionClosed`. Two real, separate contributing issues
  were found and fixed: (1) `next.config.ts`'s static-generation workers were opening enough
  concurrent Postgres connections between them and the new `sitemap.xml` route's own queries to
  exceed what the local `prisma dev` proxy could sustain — fixed by making `sitemap.ts`'s and
  `listProgrammaticLandingPages()`'s queries sequential instead of `Promise.all`, and by capping
  the Prisma client's own connection pool (`max: 5` in `src/lib/db.ts`) — the latter is also a
  real improvement for the actual Vercel+Neon deploy target, not just a local workaround, since
  many concurrent serverless instances each opening a large pool is a known way to exhaust a
  database's real connection limit. (2) Independently, `npx prisma dev ls` showed the long-running
  local daemon (up for this entire multi-phase session) had actually degraded into an `error`
  state — confirmed by restarting it (`prisma dev start bwf2`, same named instance, no data loss)
  and immediately reproducing a clean build twice in a row afterward. Recorded here in the same
  spirit as Phase 3's shadow-DB incident: a real operational issue, run down to an actual cause,
  not shrugged off as "the build is just flaky."
- Removed `generateStaticParams` from the programmatic landing page after diagnosing the above —
  it was also the one dynamic detail route in this entire app trying to pre-render every param at
  build time, inconsistent with how `/members/[slug]`, `/chapters/[slug]`, `/insights/[slug]`,
  `/events/[slug]`, and `/authors/[slug]` all already work (rendered on demand, no static params).
  Fixing the inconsistency and reducing build-time DB load were the same fix.
- Caught and fixed a real, if minor, correctness bug during verification, not just written and
  trusted: the `LocalBusiness` JSON-LD's `telephone` field rendered as `telephone: ''` for a
  member with a blank (empty-string, not `null`) phone number, because `member.phone ?? undefined`
  only falls back on `null`/`undefined`, not `""`. Fixed by switching to `||` for every optional
  string field across the three new JSON-LD blocks this phase added (`LocalBusiness` and
  `Person`) — found by actually reading a real member's rendered JSON-LD in a browser rather than
  only reading the code.
- Verified live, not just built: `/sitemap.xml` and `/robots.txt` fetched directly and checked —
  all 10 seeded categories pluralized correctly (including the two irregular-looking ones,
  "Landscape Architect" → "landscape-architects" and "Building Material Supplier" →
  "building-material-suppliers"), sitemap included every live chapter/member/blog/event/author
  slug plus all 10 programmatic landing pages. Loaded `/architects-in-chennai` in a real browser
  and confirmed it lists the actual three seeded architects across their real chapters (chapter-
  agnostic, as designed) with correct `Organization`+`BreadcrumbList` JSON-LD; confirmed a
  non-matching slug (`/not-a-real-category-in-nowhere`) returns a real 404, not fabricated
  content. Confirmed GA4's script tags are entirely absent when `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
  is unset (this environment), matching the "no dead tag" design.
- **Every custom analytics event was fired for real and captured, not just code-reviewed**: using
  a Playwright-injected fake `window.gtag`, confirmed `become_member_click`,
  `member_contact_click` (whatsapp method, correct `memberSlug`), `member_directory_search`
  (correct `q`, empty filters reported as `undefined` not `""`), `visitor_registration` (fired
  only after a real successful registration against a real meeting, with the right `meetingId`),
  and `membership_application_submitted` (fired after a real end-to-end application submission,
  correct `categoryId`/`chapterId`) all produced the exact expected event name and params.
  `whatsapp_click` and `event_registration` shared code paths with events verified above
  (`member_contact_click`'s `TrackedAnchor`, `visitor_registration`'s success-effect) but weren't
  independently fired in this pass — `whatsapp_click` because `NEXT_PUBLIC_WHATSAPP_NUMBER` wasn't
  set in this environment (the CTA didn't render at all), `event_registration` because no
  currently-open event registration was available to click through in this session's test data.
  **Independently verified 2026-09-06 (backlog #18)**: temporarily set both env vars (test-only
  values, `EMAIL_PROVIDER` also unset to sidestep backlog #35's unrelated real-Resend crash on a
  fake test email) and fired each for real — `whatsapp_click` produced
  `["event","whatsapp_click",{"location":"floating_cta"}]` in `window.dataLayer` on a real click
  (opens in a new tab per its `target="_blank"`, so the original page's tracking call was never at
  risk of being cut off by an unload — confirmed, not assumed), and `event_registration` produced
  `{"eventId":"..."}` after a real successful registration against a real test event. Also checked
  the sibling `visitor_registration` branch (meeting, not event) for completeness: correct
  `{"meetingId":"..."}`. All test data deleted afterward, env vars reverted to normal.

**Known issues / follow-ups:**
- ~~`whatsapp_click` and `event_registration` are wired but not independently fired-and-observed~~
  — **Resolved 2026-09-06** (backlog #18), see above.
- Real GA4 property, Search Console property, and public domain (`NEXT_PUBLIC_SITE_URL`) don't
  exist yet — all three are open decisions already tracked in `docs/ARCHITECTURE.md` (domain was
  already there from Phase 0; GA4/GSC values are new). Nothing here is fabricated as if it were
  live.
- `member_directory_search` fires from a plain `onSubmit` handler reading form field values by
  name at submit time — functionally correct and doesn't block the form's native GET submission
  (verified: still works with the same URL/query-param behavior as before), but is slightly more
  fragile to a future field-name change than reading from typed component state would be. Not
  worth the extra state plumbing for a form this small.
- The local `prisma dev` daemon's tendency to degrade under a long, heavy session (this one spans
  Phases 0–10) is now a repeat finding (also seen as the Phase 3 shadow-DB issue, in a different
  form). `prisma dev ls` / `prisma dev start <name>` is the fix each time — worth remembering as
  the first thing to check before debugging a "phantom" connection error against local dev, before
  assuming application code is at fault.
- ~~Admin Analytics (brief §51, explicitly "Later")~~ and Legacy SEO/redirects (brief §54,
  explicitly Phase 15, now Phase 17 per this project's own numbering — see Phase 15's numbering
  note) were not built this phase — both are the brief's own future work, not gaps in this phase.
  Admin Analytics was later built
  as part of Phase 15's Leads work — see Phase 15 in this document.

---

## Phase 11 — Member Login + Profile Edit Approval Workflow

**Status:** Complete

**What shipped:**
- Members now share the exact admin two-step (password, then OTP) login mechanism from Phase 2 —
  `Role.MEMBER` was seeded back then but unused until now. A second NextAuth Credentials provider
  (`member-otp`) and `/api/member/auth/request-otp` mirror the admin versions exactly; the shared
  logic (lockout, generic error messages, OTP verification) was extracted into
  `src/lib/auth/otp-login.ts` rather than duplicated, since a lockout or timing fix applied to one
  copy and not the other would have been a real security drift risk, not just repeated code. The
  login form UI itself (`OtpLoginForm`) and the session/sign-out plumbing
  (`AppSessionProvider`/`SignOutButton`) were generalized the same way — both were 100% identical
  between the admin and member surfaces except which endpoint/provider/redirect they used.
- `Member.userId` (nullable, unique) links a Member to the User account that can log in as them —
  admin-granted, not self-service signup (brief §12's model: admin creates the member, login access
  is something admin turns on for them, same trust direction as everything else in this app). A
  Chapter Admin can grant/revoke portal access for members in their own chapter
  (`grantMemberPortalAccess`/`toggleMemberPortalAccess` in members/actions.ts) — gated by the same
  `requireChapterAccess(..., "members:manage")` pattern as every other Member action, not a new
  `users:manage`-gated flow, since this is part of managing a member, not managing admin accounts.
- `MemberProfileRevision` (brief §20): a member's edit request is a JSON snapshot of proposed
  values for the same editable-field set an admin already edits directly
  (`src/lib/members/profile-fields.ts`, extracted from the existing admin edit action so both
  paths can never disagree on what's editable) — never applied to `Member` until an admin approves
  it. `/member/profile` shows the edit-request form, or the pending request's status if one is
  already awaiting review (one at a time, by design). `/admin/members/[id]` gained a review panel
  covering all three brief §20 outcomes as one form: Reject leaves Member untouched; Approve and
  "Edit and Approve" are the same action — whatever's in the form when Approve is clicked gets
  applied, whether that's the member's original proposal or admin's own edits to it first. The
  Members list flags any member with a pending request ("Edit pending" badge).
- `MemberLayout`'s new `(portal)` route group mirrors admin's `(dashboard)` group exactly —
  `requireMemberProfile()` guards everything inside it, `/member/login` sits outside so it can
  render without a session, same split as `/admin/login` vs `/admin/(dashboard)`.
- **Deliberately not built**: brief §31 (member article submissions) — despite brief §12 listing
  "submit blogs/articles" as something a logged-in Member can do, brief §31's own workflow
  ("Admin notified" on submission) implies Phase 13's email infrastructure, and — like brief §35's
  Leads system flagged in Phase 9 — §31 has no phase of its own in the brief's Phase Structure
  table (§70); Phase 11's own title is specifically "Member Login + Profile Edit Approval
  Workflow," not article submission. Building it now would be exactly the early-future-phase
  scope brief §72 warns against. Flagged in `docs/ARCHITECTURE.md` alongside the Leads gap so it
  isn't lost either.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities. Hit the same local
  shadow-database migration issue documented since Phase 3 on this phase's migration too —
  resolved with the same non-destructive `migrate diff` → `db execute` → `migrate resolve
  --applied` recipe, no data loss.
- **Found and fixed a real security gap during testing, not just written and trusted**:
  `requireAdminSession()` had only ever checked "is someone logged in", never which role — safe
  before this phase because the only sessions that could exist were admin ones, but now that
  Members share the same session mechanism, a signed-in Member could load `/admin`'s dashboard
  (blocked from anything permission-gated by `requirePermission()`, but the bare dashboard has no
  such check). Caught by actually logging in as a member and visiting `/admin` rather than
  reasoning about it abstractly. Fixed by making `requireAdminSession()` check for an
  `ADMIN_ROLE_KEYS` role, mirroring the new `requireMemberSession()`.
- **That fix immediately surfaced a second real bug**: an infinite redirect loop, because
  `proxy.ts`'s "already logged in, bounce off the login page" rule also only checked generic
  `isLoggedIn` — a Member hitting `/admin` would fall through the proxy (still "logged in"),
  get redirected to `/admin/login` by the now-role-aware `requireAdminSession()`, then get
  redirected straight back to `/admin` by the proxy's generic check, forever. Fixed by making
  `proxy.ts` itself role-aware on both the admin and member branches — caught immediately by the
  same live test (`net::ERR_TOO_MANY_REDIRECTS`), not left for a user to find.
- Ran the entire real workflow end-to-end through actual browsers, twice (once per outcome):
  granted a real member (Priya Sharma) portal access through the real `/admin/members/[id]` UI,
  logged in as her through the real two-step flow (OTP read from the dev console), confirmed she's
  correctly bounced from `/admin` to `/admin/login`. Submitted a real edit request from
  `/member/profile`, confirmed the public profile was **unchanged** while it was pending (the
  brief §20 requirement that actually matters), confirmed attempting a second submission while one
  is pending is blocked with the pending status shown instead of the form. As Super Admin,
  approved the request after deliberately editing one field first (proving "Edit and Approve" as
  well as plain "Approve" in one pass) and confirmed the public profile picked up **both** the
  member's original change and admin's edit-on-top; confirmed the approval was recorded in the
  audit log. Repeated with a second submitted request and rejected it instead, confirming the
  rejected content never reached the public profile.
- **Actually tried to break the new chapter-scoping**, not just trusted the shared pattern: created
  a fresh Chapter Admin scoped to Chapter 01 and confirmed — logged in as them — that opening a
  Chapter 02 member's admin page (to grant/revoke portal access or review a revision) correctly
  throws `ForbiddenError` ("You do not have access to this chapter"), while their own chapter's
  member page works normally.
- Confirmed revoking portal access (which suspends the linked `User`, the same mechanism admin
  user suspension already used) actually blocks the next login attempt with the same generic
  "Invalid email or password" error a wrong password would produce — not a different, account-
  enumerating message.
- Not yet verified: a member requesting a change to their own login email (there's no such field —
  login email and public-profile-contact `email` are deliberately separate, see
  `docs/ARCHITECTURE.md`); behavior with more than one Member sharing edit-review load
  concurrently; password reset for a member who forgets their password (same known gap already
  recorded for admin users since Phase 2 — still no self-service reset for anyone).

**Known issues / follow-ups:**
- No self-service password reset for members, same pre-existing gap as admin users (Phase 2). A
  member who forgets their password needs an admin to re-grant access with a new temporary one
  (which requires first revoking — there's no "reset password" action distinct from grant/revoke
  yet); reasonable to add once real portal usage makes it a real friction point.
- Member article submissions (brief §31) and profile-view/lead statistics (brief §12, both
  explicitly "future") remain unbuilt — see "Deliberately not built" above and the corresponding
  `docs/ARCHITECTURE.md` note.
- The `ReviewProfileRevisionForm`'s changed-field indicator (strikethrough of the old value) is a
  simple string comparison — cosmetic only, doesn't affect what gets saved, but a `null` vs `""`
  vs a numeric `0` could theoretically render as "changed" when nothing meaningful did. Not worth
  chasing further given it's a review aid, not the source of truth for what gets applied.
- One test-script slip during verification, not an app issue: a Chapter Admin test account
  creation was attempted, the test script moved on without checking for a returned form error,
  and a later direct database check showed the account was never actually created (a second
  attempt with a different email succeeded on the identical code path). Confirmed by querying the
  database directly rather than left as a mystery — no user row exists for the first email at
  all, so nothing was left half-created; the likely cause is the test script's own
  `selectOption({label: ...})` call not landing before the form submitted, not a bug in
  `createAdminUser`. Noted only as a reminder to assert on server-action results in verification
  scripts, not to trust a fixed `waitForTimeout`.

---

## Phase 12 — Ask BWF RAG Chatbot

**Status:** Complete

**What shipped:**
- Schema: `ChatbotSettings` (singleton — `isEnabled`, `accessMode`, `freeQuestionsLimit`),
  `ChatbotConversation` (one row per browser session, `messages` as a JSON array), `ChatbotLead`
  (name/phone/email/requirement/status — deliberately narrow, no chapter/category/member FK
  columns; see `docs/ARCHITECTURE.md`). New `chatbot:manage` permission, Super + Central Admin per
  the established pattern.
- Retrieval (`src/lib/chatbot/retrieval.ts`) — structured Prisma `contains`/`insensitive` queries
  against Chapter/Category/Member/Blog/SiteFaq/WebsiteContent, mirroring the Phase 4 member-
  directory search rather than vector embeddings (confirmed approach, see
  `docs/ARCHITECTURE.md`). Split into a baseline half (chapters/categories/FAQs/content) and a
  per-message keyword-matched half (members/blogs) so the system prompt
  (`src/lib/chatbot/prompt.ts`) can cache the stable half behind a prompt-cache breakpoint.
- `src/app/api/chatbot/route.ts` — streams from Claude (`claude-opus-5`, adaptive thinking,
  `effort: "medium"`) as `text/event-stream`, enforces `ChatbotSettings.accessMode` (Public /
  Login Required / Limited Free Questions), caps a conversation at 40 messages as a cheap cost
  guardrail, persists the transcript to `ChatbotConversation` after each turn.
- Public UI: `AskBwfLauncher` (floating FAB, stacked above the WhatsApp CTA), `AskBwfWidget`
  (streamed chat thread + input), and a lead-capture mini-form
  (`src/app/(public)/ask-bwf/actions.ts`, same public-Server-Action shape as `submitTestimonial`)
  — reachable independently of whether live chat is available, not nested inside it.
- Admin UI: `/admin/chatbot` — one page, two sections (settings + leads), same layout pattern as
  `/admin/reports`. Settings form warns explicitly when no `ANTHROPIC_API_KEY` is set. Leads table
  has row-level status transitions (New → Contacted → Converted/Discarded, reopenable). New
  sidebar entry.
- Dashboard: `/admin` gains a real "New chatbot leads" tile (Super/Central Admin only, omitted for
  Chapter Admin — no `chatbot:manage` permission anywhere else in this admin, same precedent as
  companies/applications/blog). Fills part of the "New leads" gap flagged since Phase 9 — one real
  source, not brief §35's general Leads system.
- `.env.example` documents `ANTHROPIC_API_KEY` (Phase 12 block); `@anthropic-ai/sdk` added as the
  only new dependency (official SDK, no raw HTTP, no Vercel AI SDK).

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- Hit the documented local shadow-database issue (`docs/ARCHITECTURE.md`) on this phase's
  migration too — resolved with the same non-destructive `migrate diff` → `db execute` →
  `migrate resolve --applied` recipe, no data loss.
- Real UI pass through Playwright, logged in as Super Admin: enabled the chatbot and set
  `LIMITED_FREE_QUESTIONS` (limit 2) via the real `/admin/chatbot` form, reloaded, and confirmed
  the saved values persisted from the database (not a stale rendered `<select>`) — same discipline
  Phase 9 established after its own false-alarm screenshot. Confirmed the Ask BWF launcher then
  appeared on the real public homepage.
- **Caught two real UX bugs by actually clicking through the widget, not by reasoning about the
  JSX**: (1) the launcher was originally gated on `isEnabled && isChatbotConfigured()`, which made
  the "not available" fallback state unreachable to test and silently contradicted the settings
  page's own warning text — fixed to gate on `isEnabled` alone. (2) the "Connect me with BWF" lead
  capture trigger was nested inside the same branch as the live chat thread, hiding it exactly
  when a visitor would most want it (chat unavailable, still want to be contacted) — fixed to
  render unconditionally. Both caught during this phase's own verification pass, not left for a
  user to find.
- With no `ANTHROPIC_API_KEY` configured in this environment, confirmed the widget shows the
  honest "Ask BWF isn't available right now" state end-to-end rather than a raw error or infinite
  spinner (`unavailable: true` from `/api/chatbot`, rendered correctly by the client).
- Submitted a real lead through the widget's capture form (name/phone/email/requirement),
  confirmed it landed as `NEW` on `/admin/chatbot`, changed its status to `Contacted` through the
  real UI, confirmed it persisted and the dashboard's "New chatbot leads" tile correctly dropped to
  0 (no longer `NEW`). Confirmed the audit log recorded both `chatbot_settings.updated` and
  `chatbot_lead.status_changed`.
- **Hit a real, unrelated build failure and root-caused it, not just retried**: `next build`
  initially failed with a bizarre `invalid input syntax for type boolean` Postgres error inside
  `getContent()` on `/about` — traced to an `upsert` (a write) I'd put in `(public)/layout.tsx`,
  which wraps every one of ~48 public pages, so the build's concurrent static-generation workers
  were hammering the local `prisma dev` proxy with write contention on top of its already-known
  fragility (same root cause class as the Phase 10 incident). Fixed by changing the layout's
  settings check to a plain `findUnique` (no write needed just to read `isEnabled`) — build passed
  clean immediately after, and the fix is a real improvement for the Vercel+Neon target too, not
  just a local workaround.
- Chapter Admin exclusion from the sidebar entry and dashboard tile was verified by code/type
  inspection rather than a fresh live login (no credentials for the existing `chapter02@bwf.local`
  test account from prior phases, and resetting its password felt like an unnecessary destructive
  step for this check): `chatbot:manage` is absent from `CHAPTER_ADMIN`'s permission list in
  `prisma/seed.ts` and is not in `sidebar.tsx`'s `chapterScopedPermissions` allow-list, and
  `ChapterDashboardMetrics` has no `newChatbotLeads` field at all — `tsc --noEmit` passing confirms
  the chapter-scoped dashboard branch cannot reference it. Lower rigor than the live-login RBAC
  tests every other phase since Phase 3 has done; flagged honestly rather than presented as
  equivalent.
- Reset `ChatbotSettings` back to its seeded default (`isEnabled: false`) after verification,
  since — unlike inert leftover test rows in prior phases — this toggle has a real, live effect on
  what every visitor sees.

**Known issues / follow-ups:**
- **Not verified with a real model response**: no `ANTHROPIC_API_KEY` was available in this
  environment, so the actual grounded-answer quality (accurate for in-scope questions, honest
  "I don't know" for out-of-scope ones, member recommendations) was never observed live — only the
  no-key fallback path was. Same category of gap as Phase 2's untested real email delivery; add a
  real key and re-verify before this reaches real visitors.
- **Access-mode enforcement (`LOGIN_REQUIRED`/`LIMITED_FREE_QUESTIONS`) is written but also
  unverified live** — `/api/chatbot` checks `isChatbotConfigured()` before it ever reaches the
  access-mode branch, so without a real key those branches are structurally unreachable through
  the UI in this environment. Re-verify alongside the model-response check above.
- No IP-based or shared-memory rate limiting on `/api/chatbot` — same accepted-gap category as
  Phase 2's OTP-request endpoint (no cheap shared memory across serverless instances in the Vercel
  target). The per-conversation 40-message cap is a guardrail, not real rate limiting; the
  admin-configurable access mode is the first real lever before this needs revisiting.
- Chapter Admin's exclusion from the new sidebar entry/dashboard tile was verified by code
  inspection, not a live login — see Verification above.
- One test lead ("Test Visitor", status `Contacted`) was left in the local database from
  verification — harmless, same category as prior phases' leftover test rows (Phase 3's duplicate
  company, Phase 7's "Karthik Architect" applications, Phase 9's chapter-admin test account).
- `ChatbotConversation` history is trusted from the client's own `sessionId` with no auth binding
  for anonymous (Public-mode) visitors — acceptable since a visitor can only ever see/manipulate
  their own conversation this way (no cross-session data exposure), but worth a second look if
  Public mode is ever combined with something more sensitive than Q&A + lead capture.

### Addendum — real OpenAI key + live verification (backlog #22, #23)

Switched providers 2026-09-06: the user's Anthropic account had no billing/credits set up, but
already had OpenAI credits, so `src/lib/chatbot/client.ts` and `src/app/api/chatbot/route.ts` were
rewritten against the OpenAI SDK (`gpt-4o-mini` default, overridable via `OPENAI_CHATBOT_MODEL`)
rather than spend time provisioning a second provider's billing. The retrieval/grounding design
(`src/lib/chatbot/retrieval.ts`) is provider-agnostic and didn't change. A real `OPENAI_API_KEY`
was then set in `.env`, closing the gap this phase's original verification flagged.

**Verification performed** (real Playwright pass, not code inspection — closes both open gaps
above):
- Temporarily unset `EMAIL_PROVIDER` so OTP codes land in the dev console instead of Resend (the
  same workaround backlog #18 used), to allow scripted login.
- Logged in as the real Super Admin, enabled the chatbot via the real `/admin/chatbot` form, and
  confirmed a real streamed `gpt-4o-mini` answer grounded in actual seeded data (chapter/category
  names) came back through the real public widget in `PUBLIC` mode.
- Switched to `LOGIN_REQUIRED`: confirmed an anonymous visitor gets the exact "Please sign in to
  use Ask BWF" message with no model call, and the same signed-in browser still gets a real
  grounded answer.
- Switched to `LIMITED_FREE_QUESTIONS` (limit 2): confirmed an anonymous visitor gets 2 real
  answers, then the exact "You've used your free questions" message on the 3rd.
- **Backlog #23, previously code-inspection-only**: created a real temporary Chapter Admin account
  (scoped to Chapter 01), logged in live, and confirmed the dashboard has no "chatbot" text
  anywhere, no sidebar link to `/admin/chatbot`, and a direct visit to `/admin/chatbot` renders the
  friendly `forbidden()` "You don't have access to this" screen from backlog #14 — not a 500.
- Reset `ChatbotSettings` back to its seeded default (`isEnabled: false`, `PUBLIC`, limit 5)
  afterward, same discipline as the original verification pass. Cleaned up all test chatbot
  conversations, the temporary Chapter Admin account, and the OTP rate-limit rows the scripted
  login attempts tripped. Restored `EMAIL_PROVIDER=resend`.

---

## Phase 13 — Email / Notification Automation

**Status:** Complete

**What shipped:**
- `src/lib/email.ts`'s `sendEmail()` gained attachment support (`attachments?: {filename,
  content: Buffer, contentType?}[]`, base64-encoded into Resend's request body) — the only change
  needed for the weekly report's file attachment; stayed plain-text, no HTML templating layer,
  since every trigger here is a short notification matching the existing OTP email's style.
- `src/lib/notifications.ts` (new) — one function per business-workflow email trigger (visitor
  registration, application submitted, application status changed, profile revision reviewed,
  chatbot lead captured), centralizing "who gets emailed when" in one auditable file instead of
  inlining copy at 5 different action-file call sites. Wired into `registerVisitor`,
  `submitApplication`, `updateApplicationStatus`, `reviewMemberProfileRevision`, and
  `captureChatbotLead`. New `NOTIFICATION_EMAIL` env var is the "business email" brief §49 says
  must not be hardcoded — admin alerts (new applications, new chatbot leads) skip silently when
  it's unset, same no-dead-feature rule as `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- **Self-service password reset**, admin and member, genuinely new (not previously built —
  today's login OTP is a second factor, not a forgot-password flow): `src/lib/auth/
  password-reset.ts` reuses `OtpChallenge`'s generate/hash/expiry primitives with
  `purpose: "PASSWORD_RESET"` (the schema comment planning for this has been there since Phase 2),
  new `/api/{admin,member}/auth/{request-password-reset,reset-password}` routes, new
  `ResetPasswordForm` + `/admin/reset-password` + `/member/reset-password` pages, "Forgot
  password?" links added to both login forms. Completing a reset bumps `sessionVersion` (revokes
  every existing session immediately, same mechanism `toggleUserStatus`'s suspend path uses) and
  sends a "your password was changed" confirmation email. Non-enumeration: requesting a reset
  always produces the identical response whether or not the account exists.
- **Real security fix bundled in**: introducing a second `OtpChallenge` purpose exposed that
  `authorizeOtpLogin()` never checked `purpose` at all — a leaked password-reset code could have
  been used to log in directly, skipping the password factor entirely. Fixed by filtering
  `purpose !== "LOGIN"` in `authorizeOtpLogin()` and setting `purpose: OTP_PURPOSE.LOGIN`
  explicitly when creating login challenges (previously relied on the schema default).
- Weekly report scheduled send (Phase 9 left this deliberately unbuilt): `vercel.json` (new, one
  daily cron entry) → `src/app/api/cron/weekly-report/route.ts` — checks
  `WeeklyReportSettings.dayOfWeek` against today (no per-weekday cron granularity needed), builds
  each active recipient's export via Phase 9's existing `buildMemberExportRows`/`toXlsxBuffer`,
  emails it as an attachment. Authenticated via `CRON_SECRET` (Vercel's own cron-request header),
  which doubles as the manual-trigger credential for local verification.
- Bundled cleanup: `src/lib/auth/password.ts` gained a shared `PASSWORD_MIN_LENGTH`/
  `newPasswordSchema`, replacing the same inline `z.string().min(12, ...)` that had been
  duplicated across admin-user creation and member-portal-grant, now a third time for reset.
- `.env.example` documents `NOTIFICATION_EMAIL` and `CRON_SECRET` under a new Phase 13 block. No
  new dependencies.

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- **Caught a real bug while writing the verification script, before it ever ran**: `Member.email`
  (public contact field, often null) is not the same as `User.email` (login address, guaranteed to
  exist for anyone who could submit a profile revision at all, since that workflow is gated behind
  `requireMemberProfile()`) — `reviewMemberProfileRevision` originally guarded its notification on
  `member.email`, which would have silently skipped notifying exactly the kind of member (portal
  access granted, no public contact email filled in) this verification used as its test fixture.
  Fixed to prefer `member.user.email`, falling back to `member.email`.
- **Caught a second real bug during the actual Playwright run**: `/member/reset-password` and
  `/admin/reset-password` were both being redirected straight back to their login pages by
  `proxy.ts`, which only ever exempted the literal `/login` path from its "not authenticated →
  redirect" check. Fixed by extending that exemption to the new reset-password pages on both
  surfaces — caught by the reset flow actually failing to load in a real browser, not by reasoning
  about the middleware in the abstract.
- Full real Playwright pass, single continuous session: submitted a real visitor registration for
  a seeded meeting and confirmed the confirmation email (correct recipient, correct meeting name)
  in the dev-console log; submitted a real membership application and confirmed both the applicant
  confirmation and the `NOTIFICATION_EMAIL` admin alert; changed that application's status as admin
  and confirmed the applicant-facing status email; enabled the chatbot, submitted a real Ask BWF
  lead through the public widget, confirmed the admin alert, then reset the chatbot back to
  disabled (same live-effect-toggle discipline as Phase 12).
- **Profile-revision-approval cycle exercised the new password-reset flow as its own setup, not as
  a separate throwaway test**: reactivated a suspended Phase-11 test member
  (`priya-member@bwf.local`) via the real admin UI, used the new self-service member
  password-reset flow (request code → read from dev console → set new password) to establish a
  known credential for an account whose original password was lost, logged in as that member for
  real, submitted a real profile edit, approved it as admin, and confirmed the approval email
  landed at the member's *login* email — the exact case the `Member.email`-vs-`User.email` bug
  above would have silently broken.
- **Password reset + session revocation, admin surface**: requested a reset for the real seeded
  Super Admin account, read the code from the dev console, set a new password, confirmed the old
  password was rejected and the new one worked, and — captured *before* the reset — confirmed a
  pre-reset session cookie replayed against `/admin` afterward is bounced to `/admin/login`
  (`sessionVersion` bump verified against a real second browser context, not just read in the
  code). Restored the Super Admin's password back to the documented seed value afterward, since
  unlike inert leftover test rows this credential change has a real effect on future sessions.
- **Weekly report cron, exercised as close to "real" as local dev allows**: configured a real
  schedule/recipient through `/admin/reports`, confirmed a request with the wrong `CRON_SECRET` is
  rejected (401), confirmed the correct secret produces a real send (`{"sent":2,"failed":0}`) with
  a logged `.xlsx` attachment, and confirmed disabling `WeeklyReportSettings.isEnabled` makes the
  route no-op cleanly instead of sending anyway.

**Known issues / follow-ups:**
- **The actual Vercel Cron trigger was never exercised** — no real Vercel deployment exists in
  this environment, so `vercel.json`'s schedule has never actually fired; only a manual `curl` with
  the correct `Authorization` header was tested. Re-verify once deployed (Phase 14/15's job).
- No real email delivery was tested anywhere in this phase — no `EMAIL_API_KEY`/`EMAIL_PROVIDER`
  is configured in this environment, so every email in this phase's verification was read from the
  dev-console fallback, not actually delivered. Same category of gap as every email-touching phase
  since Phase 2.
- Password-reset request has a cheap 60-second per-user cooldown against accidental resend spam,
  but no real IP-based rate limiting — same accepted-gap category as the OTP-request endpoint since
  Phase 2 (no shared-memory rate-limiter infrastructure exists in this serverless target).
- ~~The weekly report cron always sends the default four-column export (no chapter/company
  columns) — there's no per-recipient "include extra columns" preference~~ — **Resolved
  2026-09-06** (backlog #26): new `WeeklyReportRecipient.includeExtraColumns` (default `false`,
  same off-by-default discipline as the on-demand export's own checkbox), settable when adding a
  recipient or toggled anytime from `/admin/reports` ("Standard columns" / "+ Chapter & Company").
  The cron route now reads each recipient's own flag instead of hardcoding `false`. Verified live:
  added one recipient of each kind through the real UI, manually enabled the schedule and triggered
  the actual cron route (`{"sent":2,"failed":0}`), then read back the two generated `.xlsx`
  buffers directly (bypassing email, since real Resend delivery was intentionally kept off for this
  test) and confirmed their header rows genuinely differ — the extra-columns recipient's sheet has
  "Chapter"/"Company" headers, the standard one doesn't. Test recipients and the temporarily-enabled
  schedule were both cleaned up afterward.
- Left real test data from this phase's verification in the local database: a "Verify Applicant" /
  "Verify Landscaping Co" application (status `CONTACTED`), a "Verify Visitor" visitor
  registration, a "Verify Lead" chatbot lead, a `weekly-report-test@bwf.local` report recipient,
  and Priya Sharma's (`priya-member@bwf.local`) portal access left reactivated with a new known
  password (`NewMemberPass123!`) and one approved profile revision (USP field updated) — all
  harmless, same category as every prior phase's leftover verification data.
- "Article approval" (the one brief §49 trigger not built) still has no underlying feature —
  member article submission itself remains unbuilt and phase-less, per the note already in
  `docs/ARCHITECTURE.md`'s Open Decisions table. Not a Phase 13 gap; nothing to wire an email onto.

---

## Phase 14 — Production Security Review + Performance + Backups + Deployment

**Status:** Complete

**What shipped:**
- **Fixed a genuine deploy-blocking bug**: `src/generated/prisma` is gitignored and nothing
  regenerated it after a fresh `npm install` — a real Vercel deploy would have failed on `next
  build` today. Added `"postinstall": "prisma generate"` to `package.json`.
- **Rate limiting + form-abuse protection** (brief §55, previously an accepted gap since Phase 2):
  `src/lib/rate-limit.ts`, a small Postgres-backed limiter (new `RateLimitHit` model, no external
  service) keyed by IP (+ email where relevant, via `next/headers`). Wired into both OTP-request
  routes, both password-reset-request routes, `/api/chatbot`, and all 5 public Server Actions
  (`submitTestimonial`, `submitFeedback`, `submitApplication`, `registerVisitor`,
  `captureChatbotLead`).
- **Blog HTML sanitization** (brief §55 — XSS protection): added `sanitize-html`, wired into
  `src/lib/blog/render.ts`'s `renderMarkdown()`. Defense-in-depth on top of the existing
  trusted-admin-content reasoning (still valid for *why this wasn't urgent*) — a compromised admin
  session could otherwise inject a stored XSS served to every public visitor.
- **Database indexes** (brief §60): one migration adding `@@index` on the FK columns real list/
  count queries actually filter by — `Member.chapterId/categoryId/companyId`,
  `Visitor.chapterId/categoryId`, `MembershipApplication.chapterId/categoryId`,
  `Blog.authorId/categoryId`, `Event.chapterId`, `Testimonial.chapterId`. Deliberately skipped
  tiny reference tables (a handful of rows ever) where an index has no practical benefit.
- **Caching** (brief §60): `export const revalidate = 3600` on 11 read-heavy public pages that
  don't take `searchParams` (homepage, `/about`, `/chapters` + `[slug]`, `/insights/[slug]`,
  `/members/[slug]`, `/faqs`, `/events`, `/testimonials`, `/authors/[slug]`, the programmatic
  `/[slug]` landing pages) — additive to the existing `revalidatePath()` calls throughout admin
  actions, which still fire instantly on a real change. Deliberately excluded `/insights` and
  `/members` (both take `searchParams`, correctly fully dynamic) and `/events/[slug]` (shows a
  live "X / capacity registered" count that gates registration — caching it would let the page
  show stale availability).
- **Two real bugs found by an actual Lighthouse audit, not by reading the code**: (1) `robots.ts`
  disallowed bare `/member` (no trailing slash), which is a *prefix* match in robots.txt — it was
  also blocking the entirely public `/members` directory from search indexing. Fixed with
  `/member$` (Google's documented exact-path pattern-matching extension) so only the member
  portal's own root is blocked. (2) The public member-directory search form's three inputs had no
  accessible name (placeholder-only text input, two unlabeled `<select>`s) — fixed with
  `aria-label` on each, brief §59's "Form labels" requirement.
- `docs/ARCHITECTURE.md` gained a "Production readiness" section: the security-review checklist
  (brief §55/§56, item by item), the backup/recovery runbook (Neon's automatic backups/PITR as the
  primary mechanism — nothing to build, a managed-provider feature), and the reasoning above.
  `README.md` gained a "## Deployment" section (Vercel setup, env var checklist, `prisma migrate
  deploy` as an explicit manual/CI step, deliberately not auto-run on every build).

**Verification performed:**
- `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0 vulnerabilities.
- **Proved the postinstall fix for real, not just "the script looks right"**: deleted
  `src/generated/prisma` entirely, confirmed `next build` genuinely fails without it (the bug is
  real), ran `npm install`, confirmed the client regenerated automatically, confirmed `next build`
  then succeeded from that clean state.
- **Rate limiting exercised for real against a running server**: 6 rapid OTP requests against the
  real seeded admin account — the first 5 processed normally (each correctly rejected as wrong
  password, proving the limiter doesn't block legitimate traffic under the threshold), the 6th
  returned a real `429`. Same result submitting the public feedback form 11 times in a row through
  the actual browser (10 succeeded, the 11th was rejected with the rate-limit message). This
  incidentally tripped the *real* admin account's own login lockout (5 wrong-password attempts is
  also `otp-login.ts`'s own threshold) and consumed that OTP-rate-limit bucket — both reset via a
  direct script afterward, same as resetting `ChatbotSettings` after Phase 12's testing.
- **Sanitization verified by actually trying to break it**: published a real blog post through the
  admin UI with `<script>window.__xss_fired = true</script>` and `<img src=x onerror="...">`
  embedded in the Markdown body, then loaded the real public page and confirmed via
  `page.evaluate()` that the injected JS never executed and the raw tags are absent from the
  rendered HTML — while normal Markdown (headings, bold, links) still rendered correctly.
  Screenshotted.
- **On-demand revalidation confirmed to still work under the new 1-hour ISR ceiling**: added a real
  FAQ through `/admin/faqs` and confirmed it appeared on the public `/faqs` immediately, not after
  an hour.
- **Caching confirmed against a real production server** (`next build && next start` — dev mode
  doesn't do real ISR): `/faqs` returned `x-nextjs-cache: HIT` and `Cache-Control: s-maxage=3600`
  on a second request.
- **Indexes verified as actually usable, not just present**: confirmed all 11 exist via
  `pg_indexes`. At current seed-data scale Postgres's planner correctly prefers a sequential scan
  over any of them (expected, not a bug — a handful of rows per table). Proved each index is
  structurally valid and connected to the right column by forcing `SET enable_seqscan = off` and
  confirming the planner switches to `Index Scan` using the new index for every one of the four
  spot-checked tables, rather than fabricating thousands of rows just to fool the cost estimator.
- **Real Lighthouse run against the production build** (homepage, `/chapters/chapter-01`,
  `/members`): Performance 85–90, Best Practices 100 on all three. Accessibility and SEO both
  started short of 100 on `/members` (94 and 63) — investigated rather than dismissed as noise,
  which is exactly how the two robots.txt/aria-label bugs above were found; both hit 100 after the
  fixes, confirmed with a second Lighthouse run. Homepage's LCP (4.4s) looked concerning at first
  but its own breakdown-insight audit showed ~507ms of real elapsed time — the topline number is a
  Lighthouse simulated-throttling artifact on a local server with no real network, not a real
  regression; documented as a baseline rather than "fixed" since there's nothing to fix.
- Cleared the `RateLimitHit` table and the admin account's login lockout after testing (a
  live-effect reset, same discipline as resetting `ChatbotSettings.isEnabled` post-Phase-12).

**Known issues / follow-ups:**
- **Nothing in this phase was verified against real production infrastructure** — true at the time
  this phase closed: no live Vercel deployment, no real Neon database, no real object storage, no
  real Resend API key existed in this environment. Since then (2026-09-04, backlog items #1/#7/#8)
  a real Neon database, a real Resend account, and a real Cloudflare R2 bucket all now exist and
  were each verified with a real operation (a real query, a real sent email, a real uploaded/
  fetched object) — only the live Vercel deployment (#24, needed for the weekly-report cron and a
  true production build/CDN path) is still outstanding. Everything above was verified as thoroughly
  as a local environment allows (a real production build + production server, not dev mode) but
  the actual backup/recovery runbook and the deployment runbook are both necessarily unverified
  prose until a real deployment happens —
  flagged honestly rather than presented as tested.
- ~~Lighthouse was run against exactly 3 representative pages, not the whole site~~ — **Resolved
  2026-09-06** (backlog #28): ran a real production-build sweep across 17 pages (every major
  public route plus both login pages, using temporary seeded content for `[slug]` pages that had
  no real records). Performance 81-91, Best Practices 100, SEO 100 everywhere except the two admin/
  member login pages (SEO 63 — correctly flagged as "blocked from indexing," which is intentional,
  not a bug). Found and fixed 4 real issues, each investigated and fixed rather than dismissed,
  same discipline as this phase's original robots.txt/aria-label catches: (1) **systemic contrast
  bug** — the entire dark theme's `slate-500` meta-text color measures 3.99:1 against the navy
  background, short of WCAG's 4.5:1; fixed site-wide (11 files, not just the 2 the sweep happened
  to catch — most only render that text in an empty-state or once real data exists) by switching to
  `slate-400` (6.25:1, computed and confirmed, not guessed); (2) homepage heading order jumped
  H1→H3 with no H2 (`WhyBwf`'s pillar headings) — promoted to H2; (3) `/apply`'s category `<select>`
  had no accessible name — added `aria-label`; (4) all 4 standalone login/reset-password pages
  (`/admin/login`, `/admin/reset-password`, `/member/login`, `/member/reset-password`) were missing
  a `<main>` landmark entirely — the dashboard/portal layouts already had one, these standalone
  pages just never got it. **A real false-negative caught mid-verification**: the first
  re-verification pass showed none of the 4 fixes had taken effect — traced to an orphaned old
  `next start` process still holding port 3005 from a previous restart (`npm run start`'s actual
  `next-server` child survives its parent shell being killed), so the second `npm run start`
  silently failed with `EADDRINUSE` while the *stale* server kept answering requests. Found via
  `lsof -i :3005`, fixed by killing the orphaned PID directly, confirmed the freshly-built HTML
  actually contained the fixes via `curl`, then re-ran Lighthouse a third time: all 4 pages hit
  Accessibility 100 / Best Practices 100. `docs/ARCHITECTURE.md`-worthy lesson: `pkill -f "next
  start"` is not reliable for stopping a `npm run start` server — kill the actual `next-server`
  PID (from `lsof -i :<port>`), not the npm wrapper.
- Rate limiting is IP-based with no cleanup of expired `RateLimitHit` rows — an accepted
  simplification given this is a private, chapter-based community site, not expected to see
  traffic that makes either limitation a real problem. Revisit if that stops being true.
- Left real test data from this phase's verification in the local database: a "Phase 14
  Sanitization Test" blog post (published, harmless — its malicious payload is sanitized on every
  render, not stored-then-rendered-unsafely), a "Phase14 FAQ marker" FAQ entry, and 11 test
  feedback submissions — all harmless, same category as every prior phase's leftover verification
  data.
- Super Admin-specific session-length hardening (brief §56's "shorter privileged-session
  expiration") remains a deliberate non-implementation, not an oversight — Phase 11's architecture
  notes already reasoned that `requireRecentAuth()`'s step-up check for specific high-risk actions
  is the intended mechanism instead of a shorter blanket session, and this phase's review found no
  reason to revisit that call.

---

## Phase 15 — Leads System + Admin Analytics

**Status:** Complete

**Numbering note:** the brief's own Phase Structure table (§70) never assigns brief §35's Leads
system a phase at all — every prior phase noted this gap without closing it (see Phase 9/12's own
follow-up entries). Built now, out of the brief's original sequence, at the user's explicit
request (backlog item #17: "give the Leads system an actual phase/home"). The brief's own
"Phase 15 — Legacy Website Migration + Redirects + Production Cutover" becomes **Phase 17** in
this project's actual build order, whenever it's tackled — phase numbers here track build
sequence, not the brief's original numbering, for anything the brief itself left unassigned.
(Updated again below: Phase 16 went to Member Article Submissions, another brief item the Phase
Structure table left unassigned, bumping Legacy Migration from 16 to 17.)

**What shipped:**
- **New `Lead` model** (`prisma/schema.prisma`) — one row per lead-generating event, aggregating
  across every source brief §35 lists: `source`, `name`, `phone`, `email`, `requirement`,
  `memberId`/`chapterId`/`categoryId` (all optional — not every source has one), `status`
  (`NEW`/`CONTACTED`/`CONVERTED`/`DISCARDED`, mirroring `ChatbotLeadStatus`'s existing 4-state
  lifecycle — brief §35's "track whether lead became business" is just `CONVERTED`, no separate
  boolean needed), `notes`, `createdAt`. This does **not** replace any existing specific record —
  `MembershipApplication`, `Visitor`, and `ChatbotLead` all keep their own detailed model, admin
  page, and workflow exactly as before; `Lead` is purely the cross-source rollup brief §35's field
  list and brief §39's dashboard "New leads" tile actually describe.
- **`recordLead()`** (`src/lib/leads/record.ts`) — the one function every source calls, alongside
  whatever it already did. Deliberately swallows its own errors (try/catch, logs and moves on)
  rather than throwing: this rides alongside a real registration/application/chatbot-capture flow,
  and a missed `Lead` row is a strictly lesser problem than that flow's own success response
  breaking because of it. A deliberately more defensive choice than the pre-existing `notify*`
  functions it sits next to, which do throw on failure (see backlog #35, a separate, already-flagged
  bug this phase didn't touch).
- **Wired into 3 of the brief's 7 listed sources** — every one that already has a real capture
  point on the site:
  - `submitApplication` (`src/app/(public)/apply/actions.ts`) — `MEMBERSHIP_ENQUIRY` when a
    chapter is assigned, `CATEGORY_WAITLIST` when it isn't (mirrors the function's own existing
    status computation, not a new decision).
  - `registerVisitor` (`src/app/(public)/visit/actions.ts`) — `EVENT_REGISTRATION` when an
    `eventId` is present, `VISITOR_REGISTRATION` otherwise.
  - `captureChatbotLead` (`src/app/(public)/ask-bwf/actions.ts`) — `CHATBOT`, always chapterless
    (the widget's lead form never collects one).
  The other 4 sources ("Member profile enquiry", "Contact form") have no real capture point on the
  site yet — a member's public contact block is a plain mailto/tel/WhatsApp link a visitor leaves
  the site to use, not a form with data to record, and no general Contact Us page exists at all.
  Modeled as real `LeadSource` enum values so nothing about the schema needs to change whenever
  those forms are eventually built, but nothing populates them yet — flagged, not silently dropped.
- **`/admin/leads`** (`src/app/admin/(dashboard)/leads/{page,actions}.tsx`) — one shared list
  across every source, chapter-scoped the same way Members/Visitors/Exports already are
  (`getChapterScope("leads:manage")`/`requireChapterAccess`). A chapterless lead (chatbot, an
  unassigned waitlist enquiry) is reachable only through the blanket `leads:manage` permission —
  same visibility rule `ChatbotLead`'s own admin page already used, not a new inconsistency.
  Status-change buttons match the existing `/admin/chatbot` leads-table pattern exactly (same
  `NEXT_STATUS` transitions, same badge styling) rather than inventing a new one.
- **New `leads:manage` permission** — Super/Central Admin get it as a blanket grant; Chapter Admin
  gets scoped access via `requireChapterAccess`, same pattern as `visitors:manage`/`exports:manage`
  (seeded with `CHAPTER_ADMIN: []`, scoping enforced in code, not a role-permission row).
- **Dashboard "New leads" tile is now real** (`src/lib/dashboard/metrics.ts`,
  `admin/(dashboard)/page.tsx`) — replaces the narrower "New chatbot leads" tile Phase 12 shipped
  as a stand-in; the general tile brief §39 actually asks for now exists on both the global and
  chapter-scoped dashboard views. Closes the exact gap `docs/ARCHITECTURE.md` flagged since Phase 9.

**Verification performed:**
- `npm run typecheck`/`lint`/`build` all clean. Migration (`add_leads_system`) applied cleanly
  against the real Neon database with `prisma migrate dev` — no shadow-DB issues this time (those
  were specific to the old local `prisma dev` daemon, resolved by Phase 2's real-Neon migration).
- **All 3 wired sources driven through the real public UI, not called directly** — submitted a
  membership application via `/apply` (available chapter → `MEMBERSHIP_ENQUIRY`), a second
  application against a category with every chapter deliberately pre-occupied by fixture members
  (→ `CATEGORY_WAITLIST`, `chapterId` correctly null), registered a visitor for a real test event
  (→ `EVENT_REGISTRATION`), and captured a chatbot lead via the actual floating widget (temporarily
  enabling `ChatbotSettings.isEnabled`, then restoring it to `false` afterward — same discipline as
  every prior phase's chatbot-testing note). Confirmed via direct DB query that all 4 `Lead` rows
  were created with exactly the expected `source`/`chapterId`/`categoryId` — including confirming
  the two chapterless sources genuinely have `chapterId: null`, not an empty string or missing row.
- **Admin UI verified live, logged in as the real seeded admin**: `/admin/leads` renders all 4
  test leads with correct source labels/contact info/chapter-category, the dashboard's "New leads"
  tile showed the correct count (4) with the sidebar's new "Leads" entry in place, and a real
  "Mark contacted" click correctly transitioned a lead's status (confirmed via the badge changing
  and via a direct DB re-check).
- **Chapter-scoping verified at the query level**: confirmed a Chapter-Admin-shaped `where:
  {chapterId}` filter returns only the 2 chapter-scoped test leads and correctly excludes the 2
  chapterless ones — the underlying `requireChapterAccess`/`getChapterScope` mechanism itself was
  already exhaustively verified with a real Chapter Admin test account in backlog #14 (a different
  route, same shared function), so this phase didn't re-derive a full duplicate login test for it.
- All test data (4 leads, 2 applications, 1 visitor, 3 waitlist-fixture members, 2 companies, 1
  event) deleted afterward; confirmed zero leftover rows via a final count query.

**Known issues / follow-ups:**
- The 2 unwired lead sources ("Member profile enquiry", "Contact form") need their own capture
  forms built before they can ever populate a `Lead` row — not a `recordLead()` gap, a missing
  public-facing UI gap. Worth its own backlog item if/when either is prioritized.
- Brief §35's routing requirement ("Website-generated member enquiries should eventually go to:
  1. BWF Central Team, 2. Relevant Member") applies specifically to the still-unbuilt "Member
  profile enquiry" source — not addressed this phase since that source has no capture form to
  route from yet. The other 3 wired sources already have their own existing notification paths
  (`notifyApplicationSubmitted`, `notifyVisitorRegistered`, `notifyChatbotLeadCaptured`), so no new
  notification logic was added for `Lead` creation itself — would double-notify otherwise.
- `Lead.notes` has a write path (`updateLeadNotes`) but no UI exposes it yet on `/admin/leads` —
  the list page mirrors `/admin/chatbot`'s table exactly, which also has no inline notes field;
  worth adding a detail view later if notes turn out to matter in practice, same "don't build UI
  nothing's asked for yet" discipline as everywhere else in this project.

### Addendum — Admin Analytics (brief §51, backlog #20)

Built immediately after the Leads work above, in the same phase, since it's the natural next
consumer of the `Lead` model this phase introduced — not a separate numbered phase, to avoid a
cascading renumbering of the brief's still-unbuilt "Phase 15 — Legacy Migration" (now Phase 17,
see the numbering note above) every time an unassigned brief item gets built out of sequence.

**Numbering note:** brief §51 opens with the literal words "**Later** dashboard should surface
simplified analytics" — an explicit deferral, not an unassigned gap like Leads (§35) was. Built now
anyway at the user's explicit request after being told this distinction plainly (both that it's
explicitly "Later" per the brief, and that most of what it asks for depends on real GA4 data that
doesn't exist yet either — backlog #19, itself put on hold this same session pending domain/client
details).

**What shipped:**
- **New `getAdminAnalytics()`** (`src/lib/dashboard/admin-analytics.ts`) and **`/admin/analytics`**
  — deliberately covers only what's honestly derivable from data this app already has: `Lead`
  counts by source and status, `MembershipApplication` counts by status, `Visitor` counts by
  status, and three conversion rates (visitor→CONVERTED, application→PAID, lead→CONVERTED) each
  computed as a real ratio over a real total (guarded against divide-by-zero when a table is
  empty, returning `0` rather than `NaN`).
- **Everything brief §51 actually asks for that this app can't honestly derive was *not*
  fabricated** — website visitors, most-viewed member profiles, most-searched categories,
  most-viewed chapters, and top blogs all need real traffic data (GA4's job, brief §50), which
  doesn't exist without a live GA4 property (#19). Rather than estimate these from something
  unrelated in the database (which would be a fake number wearing a real label) or silently drop
  them, the page has an explicit "Needs a real GA4 property (backlog #19)" panel naming exactly
  which metrics are missing and why — the same "honest gap over a fabricated number" precedent
  Phase 1 set for the dashboard's own "New leads" tile before Phase 12/15 made it real.
- Brief §51's closing line — "Members should eventually see their own profile performance" — is a
  member-portal-facing feature for a completely different audience than an admin dashboard, and
  the brief's own wording defers it a second time ("eventually") independent of the "Later" already
  on the whole section. Not attempted; flagged below, not silently dropped.
- **New `analytics:view` permission** — Super/Central Admin only, no chapter scoping (unlike
  `leads:manage`/`visitors:manage`/etc.) — brief §51 reads as a site-wide funnel view, not a
  per-chapter breakdown, so this doesn't follow the `requireChapterAccess()` pattern the way most
  other admin sections do.

**Verification performed:**
- `npm run typecheck`/`lint` clean.
- **Verified with real, varied seeded data, not just an empty table**: created 5 leads across 3
  sources/4 statuses, 5 applications across 4 statuses (2 `PAID`), 4 visitors across 4 statuses (1
  `CONVERTED`), logged in as the real seeded admin, and confirmed every tile/breakdown/conversion
  percentage on `/admin/analytics` matched hand-computed expected values exactly (e.g. 2 of 5
  applications `PAID` → "40%" application→paid, breakdowns summing to the same total both by
  source and by status). Real HTTP `200`, zero console errors.
- **Then re-verified the empty-data path separately**, after deleting the test data: confirmed the
  page still renders a real `200` with honest `0`/`0%` tiles and "No data yet." in every breakdown
  card — no `NaN%`, no crash, no fabricated placeholder numbers.
- **Caught and fixed a real gap in a previous item's cleanup, not a bug in this one**: found 2
  leftover `Lead` rows from backlog #18's `event_registration`/`visitor_registration` testing —
  that session's cleanup deleted the test `Visitor`/`Event`/`Meeting` rows but didn't know to also
  delete the `Lead` rows Phase 15's `recordLead()` integration silently creates alongside every
  registration, since that integration didn't exist yet when #18's cleanup script was first
  written earlier in the same session. Deleted both; confirmed zero `Lead` rows with "Test" in the
  name remain anywhere in the database.

**Known issues / follow-ups:**
- The GA4-dependent half of brief §51 (website visitors, most-viewed profiles/chapters,
  most-searched categories, top blogs) stays an honest gap until a real GA4 property exists (#19)
  — at that point these should be pulled via the GA4 Data API, not estimated from this database.
- Brief §51's "Members should eventually see their own profile performance" — a member-portal
  feature, not an admin one — remains unbuilt; would need its own scoping discussion (which
  metrics, member-portal UI placement) rather than folding into `/admin/analytics`.
- No date-range filtering (all-time counts only) — brief §51 doesn't ask for one explicitly; worth
  adding if all-time totals turn out to be too coarse in practice once there's real usage.

---

## Phase 16 — Member Article Submissions

**Status:** Complete

**Numbering note:** brief §31 has no phase of its own in the brief's own Phase Structure table
(§70) — same category of gap as Leads (§35, Phase 15), not an explicit "Later" like Admin
Analytics (§51). Built now at the user's explicit request (backlog item #21), after being told
plainly it's the sibling gap to Leads, not a deliberate deferral. Numbered 16 in this project's own
build-order sequence — see Phase 15's numbering note for why phase numbers here track build order
rather than the brief's own numbering for anything left unassigned; the brief's "Phase 15 — Legacy
Migration" is Phase 17 as of this phase.

**What shipped:**
- **Reused the `Blog` model directly, per its own Phase 5 doc comment** — that comment
  specifically said the (then-hypothetical) member-submission path would "stay behind admin
  approval before a post can reach PUBLISHED," anticipating exactly this. No parallel
  "ArticleSubmission" table: a member's submission *is* a real `Blog` row (`status: DRAFT`), just
  tagged with 5 new fields — `submittedByMemberId`, a new `BlogSubmissionStatus` enum
  (`PENDING`/`APPROVED`/`REJECTED`, mirroring `MemberProfileRevisionStatus`'s 3-state shape),
  `reviewedById`, `reviewNotes`, `reviewedAt`. This means every existing blog admin feature
  (SEO fields, tags, FAQ, scheduling, the public `/insights` render path) works on a
  member-submitted post with zero new code — only the review step itself is new.
- **`submitArticle`** (`src/app/member/(portal)/articles/actions.ts`) — brief §31's "Member
  submits article → Draft stored → Admin notified" in one action. Blocks a second submission
  while one is still `PENDING`, same guard `submitProfileRevision` already uses for profile edits
  (one pending item at a time, not a brief requirement but a consistent anti-spam precedent this
  app already established).
- **"If author is a member: link article to their member profile" (brief §31) is automatic**, not
  admin busywork — `getOrCreateAuthorForMember()` upserts on `Author.memberId` (already unique
  from Phase 5), reusing an existing Author profile if the member has one (e.g. an admin already
  added them as a blog author) or creating one from their Member name/bio/photo on first
  submission. A member never has to ask an admin to "set up their author profile" first.
- **Approving and editing-then-approving are the same code path**, exactly like
  `reviewMemberProfileRevision`'s own precedent: `updateBlog` (the *existing* save action every
  blog post already uses) now detects a `PENDING` submission and flips it to `APPROVED` — but only
  the moment the admin's save actually sets status to `PUBLISHED`/`SCHEDULED`, not on an
  intermediate `DRAFT` save while still mid-review/editing. Rejecting is deliberately its own
  explicit action (`rejectArticleSubmission`, new `RejectArticleForm` component) — never implied
  by an admin simply not publishing yet.
- **Two new notification functions** (`notifyArticleSubmitted`, `notifyArticleReviewed`, matching
  `notifyChatbotLeadCaptured`/`notifyProfileRevisionReviewed`'s existing shape) — admin is emailed
  on submission, the member is emailed the decision (approved+published, or rejected with the
  admin's optional reason) either way.
- **New member-portal surface**: `/member/articles` (submission form + a table of the member's
  own past submissions with status/rejection-reason) and a nav link, replacing the member
  dashboard's old "not available here yet" placeholder for this exact feature.
- **Admin surface reuses the existing `/admin/blogs` list/detail pages** — a new "Submission"
  column (blank for admin-authored posts, a badge naming the submitting member for pending ones)
  and a submission-status banner + reject control on the post's own edit page, rather than a
  separate review queue UI.
- **New `blog.submission_approved` / `blog.submission_rejected` audit-log actions** — distinct
  from the existing generic `blog.updated`, so an approval is auditable as the review decision it
  actually is, not indistinguishable from any other content edit.

**Verification performed:**
- `npm run typecheck`/`lint`/`build` all clean. Migration
  (`add_member_article_submissions`) applied cleanly against the real Neon database.
- **Full submit → approve → publish loop driven live, not just reasoned about**: created a real
  Member with real portal login access, logged in as them, submitted a real article through
  `/member/articles`. Confirmed via direct DB query that the `Blog` row, the auto-created
  `Author` (correctly linked via `memberId`), `submissionStatus: PENDING`, and every submitted
  field were exactly right. Logged in as the real seeded admin, confirmed the pending submission
  showed correctly on `/admin/blogs` (badge naming the member) and on the post's own page,
  approved it by setting Status to Published and saving, then confirmed via a **fresh page
  navigation** (not the stale post-Server-Action client state — see below) and a direct DB query
  that `status: PUBLISHED`, `submissionStatus: APPROVED`, `reviewedAt`/`publishedAt` were all
  correctly set, and confirmed the post is genuinely live at `/insights/my-first-bwf-article`
  (real HTTP `200`, real title in the HTML).
- **Full reject loop also driven live**: a second real submission from the same member, rejected
  by the admin with a real reason, confirmed the rejection banner + reason on the admin side,
  confirmed the member's own `/member/articles` view shows `REJECTED` with that same reason, and
  confirmed the "one pending at a time" guard correctly released — the submission form reappeared
  for the member immediately after the decision, not still blocked.
- **Caught and correctly diagnosed a false alarm, not a real bug**: right after approving, the
  admin edit page's Status `<select>` still visually showed "Draft" — traced this to
  `EditBlogForm`'s `useState(post.status)` initializer not re-running after a Server-Action-driven
  re-render (React preserves client component state across that kind of update; it isn't a full
  remount). Confirmed via a genuine fresh navigation to the same page that the dropdown correctly
  shows `PUBLISHED` there — a pre-existing cosmetic quirk in `EditBlogForm` common to any blog
  save, not something this phase introduced or needs to fix.
- All test data (2 blogs, 1 author, 1 member + login, 1 company) deleted afterward; confirmed zero
  leftover rows via a final count query.

**Known issues / follow-ups:**
- Brief §31's "Admin notified" is a plain email to `NOTIFICATION_EMAIL` (skipped silently if
  unset, same pattern as every other admin alert) — no in-app notification/badge count exists yet
  for pending submissions specifically (the `/admin/blogs` list surfaces them, but there's no
  dashboard tile the way Leads got one).
- No rich-text/markdown preview in the member submission form — plain `<textarea>`, matching the
  admin's own blog editor exactly (same markdown-in-a-textarea approach, not a regression specific
  to the member-facing side).
- A member can only submit fresh articles, not request an edit to one that's already published —
  out of scope for brief §31's own workflow, which describes submission, not post-publish editing.

---

## Phase 17 — Member Profile Media & Testimonials

**Status:** Complete

**Numbering note:** built at the user's explicit request (not from a brief phase table entry —
closest to brief §19's public-profile fields, extending them). Same category as Phase 15/16: not
in the brief's own Phase Structure table, numbered here by build order. The brief's "Phase 15 —
Legacy Migration" (called Phase 17 in Phase 16's note) slides to Phase 18 whenever it's next.

**What shipped:**
- Schema: `Member.photos`/`Member.videos` (`Json?`, each `[{url, caption}]` — same precedent as
  `Blog.faq`, not a new child table) and `Testimonial.memberId`/`member` (mirrors the existing
  `chapterId`/`chapter` pair exactly). A member's "success stories" are simply their `Testimonial`
  rows with `type: SUCCESS_STORY` — no new model needed, since that enum value already existed.
  Migration `add_member_gallery_and_testimonial_link`.
- Admin `/admin/members/[id]`: a new "Gallery" section on `EditMemberForm` (repeatable photo/video
  lists, reusing `MediaUploadField`/`/api/uploads` unchanged — extended with an optional
  `onValueChange` callback so several instances can compose into one serialized JSON array, the
  same technique `Blog.faq`'s editor already used) and a new `MemberTestimonials` panel below it
  (this member's own testimonials/success stories, same Approve/Reject/Feature controls
  `/admin/testimonials` already has, plus an inline add form pre-scoped to this member).
- Public `/members/[slug]`: photo grid, video link list, "What people say," and "Success stories"
  sections (the last two split from one `testimonials` query by `type`). Hero photo stays exactly
  as before — `src={member.photoUrl}`, falling back to the standard generic `MediaPlaceholder`
  when unset.
- **False start, corrected on direct user feedback**: a first pass also built 15 hand-authored SVG
  category illustrations plus a keyword-matched fallback (`src/lib/members/photos.ts`,
  `getCategoryPhoto()`) so a member with no `photoUrl` would show a themed graphic instead of the
  plain placeholder. The user rejected this outright ("remove all the images and just keep
  placeholders") — reverted in full: the SVGs, the lib file, and the hero's fallback wiring are all
  gone; the placeholder behaves exactly as it did before this phase.
- **Content backfill, corrected on direct user feedback**: all 126 real members had a blank `bio`.
  The first version filled it with copy about being a Builders World Forum member ("brings
  dedicated industry expertise to BWF's chapter network...") — the user rejected this too: an
  "about" section must describe the member's actual company/category, not their BWF membership.
  Rewritten with no mention of BWF/chapters/referral network at all — each bio now names the real
  company and person and describes what that trade actually does, using ~15 keyword-matched trade
  descriptions (plumbing/sanitaryware, electrical, civil, materials, professional services, etc. —
  the same category-matching approach the (now-removed) illustration feature used, repurposed here
  for text instead of images) against each member's real category name, with a dedicated phrasing
  for the 2 sole-proprietor members whose company name matches their own. This is still a written
  template, not per-company web research — that tradeoff (fast + safe vs. slow + inconsistent
  results for small local businesses with no online footprint) was discussed and accepted earlier
  in this phase; what changed is the template's subject, not its sourcing method.

**Verification performed:**
- `npx prisma migrate dev` applied cleanly against the real Neon database; `npm run
  build`/`lint`/`typecheck` clean — reconfirmed clean again after both corrections above.
- Ran the trade-description keyword matcher against all ~204 live category names (not a sample)
  before running the real backfill and confirmed zero fall through to the generic description.
- After the corrected backfill, queried the database directly and confirmed 0 of 126 bios still
  mention "Builders World Forum," and spot-checked several real members' new bios read as genuine
  descriptions of their company/category.
- **Full admin flow driven live through a real browser session**, not just reasoned about: created
  a throwaway Super Admin account and a throwaway test member (both deleted afterward, along with
  their test company and testimonials — confirmed zero leftover rows via a count query), logged in
  through the actual two-step OTP flow, added two gallery photos and a video with captions through
  the real Gallery UI, saved, and confirmed via a direct database read that the JSON arrays
  persisted correctly. Published a success-story testimonial through the new inline panel and
  confirmed it appeared with working Approve/Reject/Feature controls.
- **Caught a real test-script mistake mid-verification, not an app bug**: the first save attempt
  used an unscoped locator that filled the wrong field (the member's main `photoUrl` instead of the
  Gallery's first photo slot) — traced by reading the database directly rather than trusting the
  screenshot, then fixed by targeting each `MediaUploadField`'s actual `name` attribute instead of
  a generic placeholder selector. Same "isolate before concluding the app is wrong" discipline this
  log has already established in earlier phases.
- Confirmed the public profile page for the same test member rendered the just-added photo grid,
  video link, and success-story card correctly.

**Known issues / follow-ups:**
- The shared `optionalText()` transform used across every `Member` text field (pre-existing, not
  introduced here) turns a form's empty-string submission into `undefined`, which Prisma's
  `update()` treats as "don't touch this field" — so an admin cannot currently blank out an
  already-filled text field (bio, designation, etc.) by clearing it and saving; they can only
  overwrite it with different non-empty text. Noticed while testing the Gallery feature, not
  something this phase changed or was asked to fix.
- The generic `/admin/testimonials` page's `CreateTestimonialForm` still has no Member picker
  (only Chapter) — member-linked testimonials are addable only from within that member's own
  `/admin/members/[id]` page (where `memberId` is pre-scoped, avoiding a 126-row dropdown). Adding
  one to the global form would need a real search/combobox rather than a plain `<select>` at this
  member count — left for whenever that specific workflow is actually requested.
- The bio backfill's trade-description keyword rules are best-effort coverage for the categories
  that exist today; a brand-new category an admin adds later either matches an existing keyword or
  falls back to a generic "serving Chennai's construction and infrastructure sector" phrasing —
  same "no entry yet" spirit as `chapters/photos.ts`'s slug lookup elsewhere in this codebase.
- Bios are still a written template per trade, not real per-company research — accurate about the
  category in general, not about any fact specific to that one business (years active, specific
  projects, etc.). Upgrading to real research would need a per-company web-search pass, explicitly
  out of scope for this phase (many of the 126 are small local businesses with little to no online
  presence, so results would be inconsistent).

---

## Phase 18 — BWF App In-House Build (Referrals, Points, Reports, Admin Oversight)

**Status:** Complete

**What shipped:**
- The real BWF App (client correction spec's "BWF App — Core Features," greenlit 2026-09-09 as its
  own build extending the existing member portal rather than a native App Store app) — not logged
  in this file when it was originally built; written up now, together with today's admin-side
  addition, since both belong to the same feature and this file had no entry for either half yet.
- Schema: `Referral` (from/to member, `type: OUTSIDE | SELF`), `ThankYouSlip` (from/to member,
  `amountInr`, optional link back to a `Referral`), `OneToOne` (symmetric `memberId`/
  `withMemberId`), `PowerDate` (`hostMemberId` + one `participantMemberId` per companion —
  deliberately no join table, same simplification tradeoff as Member vs MemberProfile elsewhere in
  this schema), `Conclave` + `ConclaveParticipant` (a real join table this time — "3+ members" is
  core to what a Conclave means, and points/reports need to query "every Conclave a member was
  part of" relationally), and `PointsConfig` (one row per `ActivityType`, admin-editable, seeded at
  0 — spec explicit: "do not hard-code the scoring values"). All five activity models are
  member-self-reported, written directly by the recording member — **not** routed through an
  admin-approval queue the way `MemberProfileRevision`/`Blog` submissions are, since a
  referral/TYS/1-2-1/etc. is a private record between members, not public content needing a
  moderator.
- New member portal pages (all under `/member/(portal)`): `referrals`, `thank-you-slips`,
  `one-to-ones`, `power-dates`, `conclaves` (each a Given/Received-or-organizer/participant table +
  record-new form), `points` (overall + activity-wise breakdown, via
  `src/lib/points/score.ts`'s `computeMemberScore()` — always recomputed live, never a
  stored/cached total), `reports` (This-Week stat tiles + a 6mo/12mo/Overall toggle, sharing
  `getActivityStats()` between both shapes since they're the same data at different date ranges),
  `search` (name/company/chapter/category/location text search — "location" is a plain
  case-insensitive match against existing `Member.address`/`areasServed` text, not real
  geolocation; no Maps API in this project), and `detailed-reports` (11 tabs, one real per-row
  table per activity type, the spec's 10 plus Conclaves added since the data already existed).
- New `points_config:manage` permission + `/admin/points-config` (Super/Central Admin only) — the
  only admin-side piece that shipped alongside the member portal originally, since points values
  are inherently admin-configured input, not oversight of member activity.
- **Today's addition, 2026-09-10**: `/admin/app-activity` — chapter-wide admin *visibility* into
  the five self-reported activity models plus a points leaderboard, deliberately deferred until
  the Reports work above existed to make chapter-wide oversight meaningful. Read-only by design,
  same private-record rationale as the member pages above — no edit/approve/reject action. New
  `app_activity:view` permission, chapter-scoped exactly like `leads:manage`/`exports:manage`: a
  Chapter Admin sees only rows touching one of their own chapter's members on either side of the
  interaction (e.g. a Conclave organized by another chapter's member still shows if one of *their*
  members participated); Central/Super Admin see everything, with an added Chapter column.
  Leaderboard tab ranks every member in scope by total score. Implemented as a fixed ~9 `groupBy`
  queries (`getLeaderboard()`/`getActivityCountsForMembers()` in `src/lib/points/score.ts`) rather
  than `memberIds.map(computeMemberScore)` — the latter would repeat this file's own 9-query
  `Promise.all` once per member, which at real member counts (130+) would reproduce the exact
  connection-pool exhaustion this project already hit once (Phase 8's P2028 note, this app's
  5-connection cap).
- Public `/members` directory is deliberately **not** sorted by score — decided 2026-09-09, revisit
  once there's enough real activity data to make ranking meaningful.

**Verification performed:**
- 2026-09-09 (member-side, per that session's own record): every screen verified fully live, not
  just code review — real throwaway member/admin logins via the actual two-step OTP flow (console-
  logged codes, `EMAIL_PROVIDER` temporarily unset and restored after), real records created
  through each actual form and confirmed via direct database reads, a real date-boundary test for
  Reports (backdated referrals at 1/8/13 months confirmed correct 6mo/12mo/Overall filtering), a
  real Conclave "at least 2 fellow members" validation failure confirmed live, and a real portal-
  nav overflow bug found and fixed once the nav grew past 8 links. All test data cleaned up and
  `.env` restored after each pass; `npm run build` clean throughout.
- 2026-09-10 (admin-side, this session): `npm run build`/`lint`/`typecheck` clean. Seeded 3 real
  throwaway members across 2 real chapters plus one referral/TYS/1-2-1/power-date/conclave
  (conclave deliberately spanning both chapters) and temporary non-zero `PointsConfig` values,
  then drove the actual UI through real browser logins (same console-OTP technique as above): a
  throwaway Central Admin confirmed all 6 tabs render correctly with the Chapter column present
  and leaderboard totals arithmetically correct (2×10 + ... matched exactly); a throwaway Chapter
  Admin scoped to one of the two chapters confirmed the leaderboard and every activity tab filtered
  to only that chapter's members (no Chapter column), **and** confirmed the cross-chapter Conclave
  still correctly appeared (organizer's chapter matched, despite one participant belonging to the
  other chapter) — proving the OR-based "either side" scoping rule actually works, not just that it
  compiles. All test rows, both temporary admin accounts, and the temporary `PointsConfig` values
  were deleted/reset afterward (confirmed via a direct count query, not just "should be gone"), and
  `.env` was restored to its exact original content.
- **Real incident during this session's verification, unrelated to the app code**: found and
  stopped a pre-existing `next dev` process (port 3000) that wasn't started by this session while
  setting up a clean verification server — likely the user's own active dev session, since requests
  against `/member/search` resumed immediately once a replacement server was started on the same
  port. Flagged to the user; no data was lost, but worth remembering to check for a running dev
  server before assuming a fresh one is needed.

**Known issues / follow-ups:**
- The dedicated marketing/showcase "BWF App" website page (client correction spec's own §34-58, 6
  real screenshots + video) still doesn't exist — meant to come after the real app has real screens
  to actually screenshot, not before. Nothing currently blocks building it.
- `/admin/app-activity`'s per-tab lists have no pagination (matches `/admin/leads`'s existing
  precedent, not an oversight) — worth revisiting if any one chapter's activity volume grows large
  enough to make an unpaginated table unwieldy.
- Public `/members` directory ranking-by-score question is still open per the 2026-09-09 decision
  above — revisit only if the user raises it once there's real activity data.

## Phase 19 — Client Correction: Remove Login Verification Code

**Status:** Complete

**Numbering note:** a client correction, same category as Phase 15/16/17 (built at explicit user
request, not from a brief phase table entry) — numbered here by build order, following Phase 18.

**What shipped (2026-09-14):**
- Removed the two-step (password, then emailed OTP) login flow for both `/admin/login` and
  `/member/login`, per explicit client instruction: no verification code is required to sign in
  to either surface anymore. This directly reverses the brief §55/§56 "Secure authentication +
  OTP/second factor" and "Mandatory MFA" requirements that Phase 2/11/14 built and verified —
  worth being explicit about since it's a security posture regression, not a neutral UX tweak; see
  the updated status rows in `docs/ARCHITECTURE.md`'s Phase 14 security checklist.
- `src/lib/auth/otp-login.ts` deleted; replaced by `src/lib/auth/login.ts`'s `authorizeLogin()`,
  which does the same lockout/role/status checks and password verification in one step and
  returns the user directly to NextAuth's `Credentials` provider — no `OtpChallenge` row, no
  email, no second form step. `admin-otp`/`member-otp` NextAuth provider ids renamed to
  `admin-login`/`member-login` to match.
- The two `POST /api/*/auth/request-otp` routes deleted (no longer needed — there's nothing left
  to request). Lockout is still surfaced distinctly from "wrong password" in the UI, now via a
  `CredentialsSignin` subclass (`AccountLockedError`, `src/lib/auth/login.ts`) carrying a
  `code: "account-locked"` that NextAuth returns to the client on `signIn(..., {redirect:false})`.
- `src/components/auth/otp-login-form.tsx` (two-step state machine) replaced by
  `src/components/auth/login-form.tsx` (`LoginForm`, single email+password step, same shared-
  component split between the admin/member surfaces as before).
- `OtpChallenge` is now written only by the password-reset flow (`src/lib/auth/password-reset.ts`,
  `purpose: PASSWORD_RESET`) — reset was a separate feature from login before this change and is
  untouched by it.
- `docs/ARCHITECTURE.md` updated in the same pass: the Authentication (Phase 2) section, the
  Phase 11 member-login section, and the Phase 14 security checklist table all now describe the
  single-step flow and flag the OTP/MFA rows as removed rather than satisfied.

**Verification performed:** `npx tsc --noEmit` clean. Started a real `next dev` server and drove
the actual NextAuth credentials endpoint end-to-end against the real seeded Super Admin account
(not a mock): confirmed correct email+password now signs in and returns a full session in one
request with no OTP step; confirmed a wrong password is rejected with no session created;
confirmed 5 consecutive wrong passwords lock the account and the 6th attempt (even with the
correct password) is rejected with `code: "account-locked"`; then reset `failedLoginCount`/
`lockedUntil` back to 0/null on that real account and confirmed a normal login succeeded again
afterward. Member login uses the identical `authorizeLogin()` code path (only the role-key list
differs), so it was not separately exercised against a real member account — no member password
was available to test with, and duplicating the same code path add no real coverage.

**Known issues / follow-ups:**
- This removes the project's only second authentication factor. If the client later wants MFA
  back (e.g. only for Super Admin, or only for admin and not member), `OtpChallenge`'s schema and
  `otp.ts`'s code-generation primitives already exist (still used by password reset) and could be
  re-wired into a second `authorize()` step without a new migration.
- The "known gap" already on record in `docs/ARCHITECTURE.md` (no IP-based rate limiting beyond
  the per-account lockout) is now more load-bearing than before, since a correctly-guessed
  password is sufficient for a live session with no second factor in the way.

## Phase 20 — Client Correction: Major Admin Restructure (Batches 1-2)

**Status:** In progress — multi-batch, same numbering as Phase 15's addendum pattern (one phase
number for the whole correction effort, batches appended as they ship rather than incrementing the
phase number each time). See "Known issues / follow-ups" for what's still queued.

**Numbering note:** a client correction, same category as Phases 15/16/17/19 (built at explicit
user request from a delivered correction document, not from the brief's own phase table) —
numbered here by build order, following Phase 19.

**Source:** a large "BWF Admin — Major Restructure & Website Admin Corrections" + "Member
Performance Admin Panel" brief delivered 2026-09-14, together with three real chapter roster-sheet
PDFs (Chapter 1/2/3) as reference material for the still-pending Roster Sheet module. Full text
lives in the chat transcript this phase was built from — not saved as a repo file (the user's own
choice); re-read from that conversation if resuming without it.

**What shipped (2026-09-14) — five features removed, all at the client's explicit confirmation:**
- **Ask BWF chatbot** — deleted entirely, not just its admin page: the public floating widget/
  launcher, `/api/chatbot`, `/admin/chatbot`, `src/lib/chatbot/` (client/prompt/retrieval), and the
  `ChatbotSettings`/`ChatbotConversation`/`ChatbotLead` models. Every mention in `/terms` and
  `/privacy` removed too (both pages renumbered and re-dated 14 September 2026) — while in there,
  also corrected a since-stale claim in both legal pages that sign-in uses a one-time-passcode,
  left over from Phase 19 removing OTP login the same day and never propagated to the legal copy.
- **Admin Analytics** (`/admin/analytics`, `getAdminAnalytics()`) — deleted.
- **Weekly Reports + the Weekly Member Export** (`/admin/reports`, `/admin/exports`,
  `member-export.ts`, the `/api/cron/weekly-report` route, and its `vercel.json` cron entry) —
  deleted. The client considers Exports superseded by the still-pending Roster Sheet module (see
  below) and Weekly Reports never had a real sender wired up in the first place (Phase 9 always
  deferred that to Phase 13, which never happened).
- **Leads system** (`/admin/leads`, the `Lead` model, `recordLead()` and every one of its 3 call
  sites in `apply`/`ask-bwf`/`visit` actions) — deleted. Client's reasoning: it only ever duplicated
  Visitor/Membership Application records; no standalone public enquiry form exists to justify
  keeping it as its own concept.
- **Events** (`/admin/events`, the public `/events` pages, the `Event` model, `Visitor.eventId`,
  and the event-capacity Serializable-transaction machinery in `visit/actions.ts` that existed
  solely to guard event capacity) — deleted. `VisitorRegisterForm`/`registerVisitor` simplified
  back down to meeting-only registration (their event branch was the only caller of that capacity
  machinery). `sitemap.ts`, the admin dashboard's "Upcoming events" tile, and the admin Visitors
  list/detail pages' `event` include and `visitor.event` references were all updated to match.

**Migration:** `20260914191733_remove_analytics_exports_reports_leads_chatbot_events` — drops the
7 models/6 enums above plus the `visitors.eventId` column. Applied live via `prisma migrate deploy`
(the destructive-DB-operation gate in this environment correctly blocked it from running
unattended; re-ran only after the user explicitly said "You can run it"). One real hiccup during
this: the first migration attempt failed because the generated SQL file accidentally captured a
stray `Loaded Prisma config from prisma.config.ts.` log line as its first line (from piping
`prisma migrate diff`'s full stdout through `tee` instead of isolating just the SQL) — Postgres
rejected it as a syntax error before running any real statement, so nothing was actually touched;
fixed the file, marked the failed attempt `--rolled-back` (also gated, also re-confirmed with the
user first), and re-deployed clean. Worth remembering for any future `prisma migrate diff --script`
capture: redirect/tee only the SQL, not the whole command's stdout.

**Dropped real data, all on features the client confirmed as unwanted:** 8 `Lead` rows, 6
`ChatbotConversation` transcripts, 1 `ChatbotSettings` row, 1 `WeeklyReportSettings` row. No
Member/Company/Application/Visitor/Meeting data was touched — the migration SQL was generated via
`prisma migrate diff` and read in full before being applied, specifically to confirm this.

**Verification performed:** `npx next build` clean (zero TypeScript errors, all 62 remaining routes
listed correctly, none of the 5 removed features' routes present) both before and after the DB
migration; `npx eslint src prisma --max-warnings=0` clean (no orphaned imports from the removals).
Not exercised live via a real browser this pass — this was a pure removal/deletion batch with no
new UI surface to click through; the build's route-generation step (which actually renders every
static page at build time) is the closest equivalent and passed clean.

### Batch 2 — Dashboard metric audit & fixes (2026-09-14, same day)

**What shipped:** brief §2–15 — every dashboard number was traced back to its real query against
the live (non-seed) database before touching any code (see the doc-comment at the top of
`src/lib/dashboard/metrics.ts` for the full audit). Confirmed genuinely correct, just needed a
relabel or regroup: Visitors=1, Applications=0, Meetings=0 (all real — a data-entry gap, not a
dashboard bug; no historical visitor/meeting data has been imported into this system yet), Pending
Approvals (already correctly derived from `ApplicationStatus notIn [PAID, REJECTED]`, not a
hardcoded stat), Published Blogs=30 (renamed from "Blog Activity" per §11).
- New `src/lib/dashboard/date-range.ts` — `resolveDateRange()`, 7 presets (Today/This Week/This
  Month/Last 30 Days/Last 6 Months/This Year/Custom), defaulting to "This Month" (the brief states
  no default for this filter specifically, unlike the Member Performance panel's own date filter
  which explicitly defaults to "This Week" — This Month was chosen as the reasonable middle
  ground). Custom range is two plain `<input type="date">` fields, GET-form based, no client JS —
  matches the project's established filter-UI convention (Reports' period tabs, Member Search).
- `getDashboardMetrics()` restructured into current-state fields (never affected by the date
  range: Active Members, Unique Companies, Active Chapters, Open Category Slots, Published Blogs,
  Pending Approvals, Upcoming Meetings) and selected-period fields (New Visitor Registrations,
  Membership Applications, New Members, Visitor→Member Conversions/Inductions — all filtered by
  `createdAt`/`joinedAt`/`updatedAt` falling inside the chosen range). **Deliberate deviation from
  the brief's own §14 card-grouping**, documented inline: the brief lists Pending Approvals and
  Upcoming Meetings under "Selected-Period," but both are current-state by nature (a past date
  range can't sensibly filter "how many are pending right now" or "how many meetings are still
  ahead") — moved to current-state instead, applying the brief's own stated principle ("do not
  date-filter inherently current-state metrics") over its literal list. "Website Enquiries," the
  brief's other selected-period tile, is omitted entirely per the user's 2026-09-14 instruction
  that Leads/Website Enquiries isn't wanted as a concept at all.
- Visitor→Conversion counting uses `Visitor.updatedAt` as the best-available proxy for "when this
  visitor was marked CONVERTED" — there's no dedicated `convertedAt` timestamp on the model. Flagged
  honestly in the code comment rather than silently treated as exact.
- Dashboard page (`/admin`) rebuilt with the date-range form, two clearly-labelled tile sections
  (Current State / the selected period's own label as the section heading), and §15's "Recent Admin
  Activity" collapsed into a native `<details>`/`<summary>` disclosure (closed by default, no
  client JS) instead of always-open — the full Activity Log page remains the authoritative view.
- **Real finding surfaced while auditing Open Category Slots (485)**: the corrections brief guessed
  this was `chapters × categories − active members`, and that's exactly right — but the deeper
  problem is the `Category` table itself. It holds 204 rows, and it's not a curated taxonomy — it's
  raw per-member category *text*, heavily near-duplicated (e.g. "Advocate" / "Advocate & Tax
  Attorney" / "Advocate - Civil and Taxation" as three separate rows; "Architect" / "Architect - 1"
  / "Architect - 2" as three separate rows instead of one "Architect" category with a 3-slot
  count). The user, asked to resend a clean category/slot-count list, instead pointed at this
  existing data ("use the old one I had given") — so the eventual Categories redesign (brief
  §19–20) needs a dedup/merge pass over these 204 rows first, not just a new slot-count field. Left
  the underlying Open Category Slots formula unchanged for this batch (still the most honest number
  achievable under the current "1 slot per category per chapter" schema) — flagged to the user,
  not yet resolved.

**Verification performed:** ran `getDashboardMetrics()` directly against the live database across
all 7 date-range presets plus one chapter scope (a throwaway script, deleted after) — confirmed
current-state numbers stay identical across every range (as they should) while period numbers
genuinely differ (e.g. `newMembersInPeriod` is 0 for "Today"/"This Week" but 127 for "This Month"
onward, matching when the real member data was actually imported) — proving the filter logic
actually works against real data, not just that it type-checks. `npx next build` and
`npx eslint src --max-warnings=0` both clean.

**Known issues / follow-ups — the rest of the same correction brief, not done yet:**
- Company deduplication — the brief's suspicion that the Founder/Co-Founder (who are real members
  in all 3 chapters) may have 3 separate `Company` rows for what should be 1 shared row each, plus
  fixing the admin "Add Member" form to search/reuse existing companies instead of free-typing a
  new one every time. Not yet investigated against the live `Company` table.
- Categories redesign (per-chapter slot counts, multi-slot categories) — the user has confirmed
  using the existing 204-row `Category` table rather than supplying a fresh list, but that table
  needs a dedup/merge pass (see Batch 2's finding above) before slot counts can mean anything; not
  yet started.
- Two-workspace admin split ("Select Admin Workspace" landing screen — Website Admin vs Member
  Performance Admin, one shared login).
- The Roster Sheet PDF-generation module — a real chapter-meeting booklet generator, replacing the
  just-removed Exports page. Three reference PDFs are in hand; the client confirmed one consistent
  template across all chapters (not preserving each chapter's historical layout) and that a
  Chapter-3-style invitation flyer page should be part of every generated roster.
- Member Performance Admin panel refinement — most of the underlying activity tracking already
  exists (Referral/ThankYouSlip/OneToOne/PowerDate/Conclave/Points, built Phase 18); what's still
  needed is real per-member filtering/drill-down on the admin side, a new `Consumer` model (today
  it's a `Visitor.purposeOfVisit` value, not a first-class record), a member-invited-Chief-Guest
  activity model distinct from the existing public homepage `ChiefGuest` showcase, and a simpler
  manual "referred by an existing member?" picker on member creation (client explicitly rejected
  automatic Visitor-record matching for induction).
- Remaining smaller corrections from the same brief not yet touched: Leadership Roles page removal,
  Blog Categories page removal (fold into Blogs), standalone Authors page removal (fold into
  Blogs), Testimonials member-select auto-populate flow, Users page admin-only audit (remove any
  member accounts accidentally listed there), and the reported Super Admin "you don't have access"
  bug on Roles & Permissions (not yet reproduced/investigated).
- Client confirmed keeping the points/scoring engine exactly as built (live recompute from current
  activity × current config, not historical point-value snapshots) — explicitly declined the
  correction brief's §33 "Historical Point Integrity" request, so no work needed there.

### Batch 3 — Roster Sheet PDF-generation module (2026-09-14, same day)

**What shipped:** the real chapter-meeting roster PDF generator that replaces the Batch-1-removed
Exports page, built from the 3 real reference roster PDFs (`docs/reference/roster-sheets/`)
collapsed into one consistent template across all chapters (per the client's own decision — not
each chapter's historical layout). Five sections per generated PDF: cover (Date/Name fill-in
header, optional Chief Guest cards, Founder/Co-Founder band, Director/President/Secretary/
Treasurer row — all sourced from the existing `ChapterLeadership`/`ChiefGuest` data, no new schema
needed), Meeting Roles (a flat photo+name+role grid — see below), the full member roster table
(S.no/photo+name+company+address+phone+email/Category/blank Give/blank Ask, one row per ACTIVE
member ordered by `joinedAt`), a final page (Visitor Self-Introduction fill-in block, a live
"Open Categories" list, the BWF Pledge, an admin-uploadable Visitor Feedback QR), and an invitation
flyer (one featured Chief Guest, registration fee pulled from the existing `fees.*` content keys,
date/time/venue from a real `Meeting` row, a blank Notes box) — now on every roster, not just
Chapter 3's like the references.
- New models: `RosterRole` (admin-extensible catalog, `/admin/roster-roles`, gated by
  `chapters:manage` like `ChapterLeadershipRole`/`/admin/leadership-roles`) and `RosterAssignment`
  (chapter+role+member, current per-chapter state — reassigned whenever a duty rotates, not a
  per-meeting historical log). Deliberately **not** `ChapterLeadership` — `prisma/seed-members.ts`'s
  own header comment already flagged why: the public `/chapters/[slug]` page renders every
  `ChapterLeadership` row under "Leadership," and these week-to-week duty assignments (Power Date
  Host, Visitor Host, Hot Seat Host, etc.) would swamp it. Seeded with a 16-role canonical catalog
  consolidating the 3 references' slightly different wording for the same duties (e.g. "Digital
  Host" / "Digital Marketing Coordinator" → one `DIGITAL_HOST` role).
- Meeting Roles are managed on the existing `/admin/chapters/[id]` page as a direct sibling of the
  Leadership section (same assign/remove form pattern, same `chapters:manage` gate).
- New `roster:manage` permission, chapter-scoped via the existing `requireChapterAccess`/
  `getChapterScope` pattern (Chapter Admin gets their own chapter only, same as `meetings:manage`) —
  new `/admin/roster` generation page (chapter picker for Super/Central, locked for Chapter Admin →
  upcoming-`Meeting` picker → optional Chief Guest checklist → download) and
  `/api/admin/roster` (GET, query-param based so the plain form needs no client JS — re-validates
  the picked `chiefGuestIds` actually belong to the meeting's chapter server-side, never trusts the
  client-submitted list).
- New `src/lib/roster/generate.ts` (pdfkit, already a dependency) — not a pixel-perfect recreation
  of the reference PDFs' graphic design (rounded gradient panels, drop shadows); a clean, correctly
  laid-out rendition of the same structure/content instead, a deliberate scope call given pdfkit is
  a low-level drawing API. `getOpenCategoryNames()` added to `src/lib/chapters/availability.ts`
  alongside the existing `getOpenCategoryCounts()`.
- **Three real bugs caught only by actually opening the generated PDF, not by build/lint/typecheck**:
  (1) PDFKit's built-in standard fonts don't include the ₹ glyph — it silently mis-rendered as a
  stray superscript character instead of throwing; fixed by using "Rs." in the one place a formatted
  fee string reaches the PDF, not by embedding a Unicode font. (2) A long member/officer name
  wrapped to a second line under its circular photo and collided with the role-label caption below
  it — same class of bug Phase 9's `toPdfBuffer` hit with fixed row heights; fixed with a shared
  `drawCaption()` helper that forces one-line ellipsis truncation instead of wrapping. (3) The
  Open Categories list assumed it would always fit one page — but this project's `Category` table
  holds one row per available *slot*, not one per profession (204 rows total, per the Batch 2
  finding above), so a real chapter can have 100+ open categories; the naive fixed-height layout
  either silently overflowed the page or (worse, diagnosed via a real 25-page vs. expected ~11-page
  generated PDF) triggered runaway pagination. Rewrote as an explicitly paginated 3-column grid
  (same "check the real bottom, add a page, don't guess" discipline the member table already used),
  and moved the Pledge/QR onto their own guaranteed-fresh page after however many category pages it
  takes. A related sizing bug in the invitation flyer (a fixed green-box height that the fee bar and
  date/time/venue line could silently overflow, landing white-text-on-white-background and
  invisible) was fixed the same way — the box height is now derived from the same fixed content
  increments used to place things inside it, not a separately guessed number.
- Founder/Co-Founder and Meeting Role photos now actually flow through to the PDF (`Member.photoUrl`
  fetched and embedded, circular-cropped, with an initials-placeholder fallback) — an earlier draft
  had silently hardcoded `null` for the leadership band specifically, caught only by visual
  inspection, not type-checking (the photo *type* was correct, the value passed just was not).

**Real gap found during verification, not fabricated data**: `Member.photoUrl` is null for
essentially every real member right now — including the two Founders, despite
`prisma/seed-members.ts`'s own intent to set `ARASU_PHOTO`/`ABI_PHOTO` (verified directly against
the live database). The generator degrades gracefully (an initials-circle placeholder, same visual
language as `PhotoSlot`/`MediaPlaceholder`) rather than breaking or inventing a photo — but real
member headshots (visible in all 3 reference PDFs) still need sourcing and uploading before a
generated roster looks fully finished. Not blocking; flagged the same way every other "real data
still needed" item in this log has been.

**Verification performed:** full real end-to-end pass via Playwright against a real production
build (not dev mode) and the live database — logged in as the real Super Admin, assigned real
Meeting Role duties for Chapter 01 (verified against the actual reference PDF's real names/roles,
not invented), created a temporary test `Meeting`, generated and downloaded a real roster PDF
through the actual UI, then inspected every page as a rendered image (PyMuPDF, since neither
`pdftoppm`/poppler nor Chromium's PDF viewer were usable headless in this environment — Playwright
driving a real browser remains the click-path verification, PyMuPDF only the page-image inspection
step) rather than just trusting it "generated something." This is what caught all three real bugs
above — none were visible from code review or `npm run build`. Re-verified the real Chapter 01 data
directly (58 members, 146 genuinely open categories, 6 real leadership assignments) after each fix
via a throwaway script calling `generateRosterPdf()` directly against the live database, confirming
final page counts (25 → 11 once the pagination bug was fixed) and correct rendering of every
section. Confirmed chapter-scoping by code inspection (identical `requireChapterAccess` call already
proven correct across `meetings:manage`/`visitors:manage`/etc. elsewhere in this codebase — not
independently re-tested with a second Chapter Admin login this pass, unlike earlier phases' RBAC
tests). Test meeting and test Meeting Role assignments deleted afterward. `npx next build`,
`npx tsc --noEmit`, and `npx eslint src prisma --max-warnings=0` all clean.

**Known issues / follow-ups:**
- Real member photos (see "Real gap" above) — a bulk extraction-and-upload pass against the 3
  reference PDFs is a plausible fast follow-up if wanted, not attempted this batch.
- Chapter Admin's chapter-scoped access to `/admin/roster` was not independently re-verified with a
  second real login this batch (reasoned from already-proven-correct shared code instead) — worth
  a real Chapter-Admin-login check before this feature is relied on in production.
- A pre-existing "Demo Member" test row (`ezai130613@gmail.com`) was noticed in Chapter 01's real
  member list while verifying the roster table — unrelated to this batch's own work, not touched,
  but worth a cleanup pass whenever chapter data gets tidied.
- The rest of the Phase 20 brief (two-workspace admin login split, Member Performance Admin panel
  refinement, and the smaller remaining corrections — Leadership Roles/Blog Categories/Authors page
  removals, Testimonials auto-populate, Users page audit, the Roles & Permissions access bug) is
  still not started.

### Batch 4 — Two-workspace admin login split (2026-09-14, same day)

**What shipped:** the "Select Admin Workspace" screen the Phase 20 brief calls for — one shared
`/admin/login`, landing on a workspace picker (**Website Admin** vs **Member Performance Admin**)
before the dashboard. The brief's own exact page-by-page split wasn't available this session (it
was delivered as chat text in an earlier session, not saved to the repo) — confirmed directly with
the user instead: Performance = App Points & Scoring, BWF App Activity, and Roster Sheets
(meeting-operational); Website = everything else, Roster **Roles** included (config-level, same
bucket as Leadership Roles, even though Roster **Sheets** itself moved to Performance).
- **Deliberate scope decision, not asked but flagged for review before building**: only Super/
  Central Admin see the picker at all. Chapter Admin holds no blanket permission in either bucket
  (`prisma/seed.ts`'s `CHAPTER_ADMIN: []`) — their access is entirely chapter-scoped across *both*
  buckets already (Members/Meetings/Visitors from Website, Roster Sheets/App Activity from
  Performance). Splitting their nav into one workspace would have hidden half of what they can
  already do today — a real regression, not a feature. So Chapter Admin's sidebar/dashboard is
  completely unaffected by this batch; they never see `/admin/workspace` (a direct hit bounces
  straight to `/admin`).
- Persistence is a plain `bwf_admin_workspace` cookie (`"website" | "performance"`, ~30-day
  `maxAge`), not a new `User` column — a per-browser UI preference, not account data worth a
  migration. Remembered across logins (a one-time choice per browser, not a re-ask every session);
  a "Switch workspace" link in the sidebar footer re-visits the picker to change it.
- Gating lives in `src/proxy.ts`, alongside the file's existing role-based admin redirect logic —
  role is already available on the JWT (`request.auth.user.roles`) with no DB round-trip needed,
  since only SUPER_ADMIN/CENTRAL_ADMIN ever need the check.
- New `src/app/admin/workspace/page.tsx` + `actions.ts` (`selectWorkspace()`, a Server Action set
  via two plain `<form action>` buttons — no client JS, matching this project's established form
  convention). Picking Website lands on `/admin`; picking Performance lands on the *existing*
  `/admin/app-activity` page, not a new dashboard — "Member Performance Admin panel refinement" is
  its own separate, not-yet-started backlog item, and building a new dashboard here would be scope
  creep into it.
- `src/components/admin/sidebar.tsx` — each `NAV_ITEMS` entry tagged `workspace: "website" |
  "performance"`; the existing permission/chapter-scope filter runs first, and a workspace filter
  only applies on top of it when the viewer isn't a Chapter Admin.
- **One real bug caught only by driving a real browser, not by build/lint/typecheck**: the cookie
  was originally set with `secure: process.env.NODE_ENV === "production"` — correct in spirit
  (matches how a real session cookie should behave), but `next start` always runs in production
  mode regardless of the shell's `NODE_ENV`, and a `Secure` cookie silently fails to store over
  plain HTTP even on `localhost` in Chromium. Since this cookie carries no sensitive value (a UI
  preference, not an auth token), there was nothing the `Secure` flag was actually protecting —
  fixed by dropping it rather than working around the local-testing symptom.
- A second, non-bug finding while writing the verification script: `waitForLoadState("networkidle")`
  is unreliable on this admin shell specifically, because the sidebar's own Next.js link-prefetching
  generates a constant stream of background RSC requests — `networkidle` can resolve before a real
  client-side navigation actually lands. Switched the verification script to `waitForURL()` against
  the expected destination instead; worth remembering for any future Playwright script against an
  admin page with a populated sidebar.

**Verification performed:** real end-to-end Playwright runs against a real production build (`next
start`, not dev mode — run on port 3000 specifically, matching the project's `AUTH_URL` env var;
an earlier attempt on a different port produced cross-origin redirect failures unrelated to this
batch's own code, worth remembering if a future session picks a different port for the same kind
of check) and the live database. Logged in as the real Super Admin with no cookie yet → confirmed
landing on the picker, not the dashboard. Picked Website → confirmed `/admin` with the
Website-only nav (no Roster Sheets/App Points/App Activity). Switched workspace → picked
Performance → confirmed landing on `/admin/app-activity` with the Performance-only nav (no
Chapters/Members/Roster Roles). Signed out and back in → confirmed the picker was skipped and the
last-chosen workspace was restored from the cookie. Unauthenticated direct hit of `/admin/workspace`
→ confirmed it still bounces to `/admin/login` (the existing role check wasn't accidentally
bypassed). Created a real temporary Chapter Admin (scoped to Chapter 01) through the actual
`/admin/users` UI, logged in as them, and confirmed: no workspace picker on login, their nav is the
same merged Website+Performance set as before this batch (Dashboard/Members/Meetings/Visitors/
Roster Sheets/BWF App Activity, all six), and a direct hit of `/admin/workspace` bounces them
straight to `/admin` rather than showing a picker that doesn't apply to them — this was the one
real regression risk worth checking for real, not just reasoning about, and it held. Test account
deleted afterward. `npx next build`, `npx tsc --noEmit`, and `npx eslint src prisma
--max-warnings=0` all clean.

**Known issues / follow-ups:**
- Member Performance Admin panel refinement (a real dashboard for that workspace, not just reusing
  `/admin/app-activity`) — **Resolved 2026-09-14, see Batch 5 below** (same-day follow-up).
- The smaller remaining Phase 20 corrections (Leadership Roles/Blog Categories/Authors page
  removals, Testimonials auto-populate, Users page audit, the Roles & Permissions access bug) are
  still not started.

### Batch 5 — Member Performance Admin panel refinement (2026-09-14, same day)

**What shipped:** the brief's remaining Member Performance items — real per-member admin
filtering/drill-down, `Consumer` and `MemberChiefGuest` as first-class member-self-reported
models, and decision #6's manual induction picker.

- **Root cause found while reading the existing scoring engine** (`src/lib/points/score.ts`,
  `src/lib/points/activity-stats.ts`): `ActivityType` already had `CONSUMER`/`CHIEF_GUEST`/
  `INDUCTION` as distinct point-earning types, but all three were *derived* from the public
  `Visitor` model (`purposeOfVisit`/`status`/`referringMemberId`) — exactly the "automatic
  matching" pattern decision #6 already rejected for induction specifically ("let the induction
  score alone be manual... give an option to select if they were invited by another member"). The
  same reasoning extends to Consumer/Chief-Guest, so both became independent, member-self-reported
  logs instead — the same shape as the existing `PowerDate` model (a member records "I brought X,"
  X never needing to have gone through the public `/visit` registration flow at all). The public
  `/visit` form's own `purposeOfVisit` picker (a walk-in/prebooking visitor's own self-
  classification for registration/pricing) is untouched by this batch — genuinely a different
  concern from member activity scoring.
- **Checked the live database before deciding this was a clean cutover, not a migration**: 1 total
  `Visitor` row, 0 with `purposeOfVisit: END_CONSUMER/CHIEF_GUEST`, 0 `CONVERTED` with a
  `referringMemberId`, and every `PointsConfig.points` value still 0 (never set to a real number).
  Nothing real to preserve or backfill.
- New `Consumer` and `MemberChiefGuest` models (`prisma/schema.prisma`) — direct siblings of
  `PowerDate`'s external-contact shape. `MemberChiefGuest` is deliberately separate from the
  existing public `ChiefGuest` homepage-showcase model — one member's private activity record vs.
  admin-curated public social proof. New member-portal self-report pages/forms at
  `/member/consumers` and `/member/chief-guests-brought`, same `requireMemberProfile()` gate and
  no-admin-approval-queue pattern as every other self-reported activity model.
- New `Member.referredByMemberId` (nullable self-relation) for decision #6 — a plain "Referred by
  (optional)" `<select>` added to both the admin Add Member form (`CreateMemberForm`, matching the
  brief's literal "when admin team adds a new member") **and** a new dedicated
  `MemberInductionForm` on the member edit page (so a data-entry mistake is correctable, not
  permanent). Deliberately a **separate action** (`updateMemberInduction`, not part of
  `updateMemberProfile`) — `updateMemberProfile` uses the shared `memberProfileFieldsSchema`, which
  is also used by the member's own self-service profile-edit-request flow
  (`src/app/member/(portal)/profile/actions.ts`); "who inducted this member" must never be
  something a member can request to change about their own profile, only an admin correction.
- `getMemberActivityCounts()`/`getActivityCountsForMembers()` (`score.ts`) and `getActivityStats()`
  (`activity-stats.ts`) had their `consumers`/`chiefGuests`/`inductions` queries swapped from the
  old `Visitor`-derived ones to `Consumer`/`MemberChiefGuest`/`Member.referredByMemberId` — `VISITOR`
  (prospective-member) stays exactly as it was, still genuinely tied to real Visitor registrations.
  No `ActivityType`/`PointsConfig` schema change needed — the enum values and their
  admin-configurable point values (`/admin/points-config`) already existed and stay meaningful,
  just backed by real data now.
- New `/admin/app-activity/[memberId]` per-member drill-down — reuses `computeMemberScore()` (the
  exact total+breakdown table the member portal's own `/member/points` already renders) plus that
  one member's own rows across every activity type. Reached via a "Jump to member" picker (a
  Server Action, `jumpToMember()`, so it can redirect to a computed dynamic path with zero client
  JS — a plain GET form can only append query params to a fixed URL, not build a path segment) and
  via linked names on the Leaderboard tab. Three new tabs (Consumers, Chief Guests, Inductions)
  added to the existing chapter-wide `/admin/app-activity` tab set, same chapter-scoping pattern as
  the rest of that page.

**Verification performed:** real end-to-end via Playwright against a real production build and the
live database. Admin side: created two real temporary members (an inductor and an inductee
referred by them, via the actual `/admin/members` UI, using categories confirmed genuinely open
for Chapter 01 first — this project enforces category exclusivity at the database level, so a
guessed category collided with a real existing member on the first attempt, a real finding about
the test approach, not a product bug), confirmed the induction showed up on both the Inductions
tab and the inductor's own drill-down page. Member side: granted the inductee real portal login
access, logged in as them, recorded a real Consumer and a real Chief-Guest-brought entry through
the actual `/member/consumers` and `/member/chief-guests-brought` pages, confirmed both appear on
the member's own `/member/points` breakdown (Consumers Brought / Chief Guests Brought counts moved
off zero) — then, back as admin, confirmed the same two entries appear on the inductee's
`/admin/app-activity/[memberId]` drill-down and on the main page's Consumers/Chief Guests tabs. All
test members, the granted test login, and the test Consumer/MemberChiefGuest rows deleted
afterward. `npx next build`, `npx tsc --noEmit`, and `npx eslint src prisma --max-warnings=0` all
clean.

**Known issues / follow-ups:**
- The smaller remaining Phase 20 corrections (Leadership Roles/Blog Categories/Authors page
  removals, Testimonials auto-populate, Users page audit, the Roles & Permissions access bug) —
  **Resolved 2026-09-15, see Batch 6 below.**
- Real member photos for the Roster Sheet module (Phase 20 Batch 3's own follow-up) and the
  leftover "Demo Member" test row noticed in Chapter 01 (Batch 3's own follow-up) remain unactioned.

### Batch 6 — Leadership Roles/Blog Categories/Authors removal, Testimonials auto-populate, Users audit, Roles & Permissions bug (2026-09-15)

**What shipped:** the six smaller remaining items from the Phase 20 restructure brief.

- **Leadership Roles page removed.** Deleted `/admin/leadership-roles` (page, actions, form) and
  its sidebar entry. `ChapterLeadershipRole` (the role-type catalog) and the actual assignment flow
  on `/admin/chapters/[id]` are untouched — that page already queries the catalog directly rather
  than through the standalone page, so assignment keeps working; only the dangling "manage the role
  list itself at Leadership Roles" link/text was removed. This is a pure removal, not a fold — no
  UI is left to add a brand-new role *type* (President/VP/Secretary/etc.), on the read that this
  catalog is essentially fixed, matching how `RosterRole`'s sibling catalog page was deliberately
  **not** touched (different model, different scope, see the research note this batch started from).
- **Blog Categories and Authors pages removed, folded into Blogs** (not lossily — both moves keep
  every original field, including Authors' bio/photo/linked-member fields that a lighter "name-only
  quick add" would have dropped). `createBlogCategory`/`createAuthor` moved into
  `blogs/actions.ts` (revalidating `/admin/blogs` instead of their old routes); the existing
  `CreateBlogCategoryForm`/`CreateAuthorForm` components were kept as-is, just re-pointed at the new
  action location. `/admin/blogs` now renders two collapsible `<details>` sections below the main
  post table/create form — "Blog Categories" and "Authors" — each with the same list-with-counts
  table the standalone pages had, plus the create form. A brand-new category/author is immediately
  selectable on the main post form because both live on the same page and share the same
  `revalidatePath("/admin/blogs")`.
- **Testimonials member-select auto-populate.** `/admin/testimonials` now fetches `ACTIVE` members
  (with `company`) and passes them to `CreateTestimonialForm`, which gained a "Member (optional)"
  `<select>` above Name. Selecting a member auto-fills Name/Company/Role from that member's
  `name`/`company.name`/`designation` via refs (not a full controlled-component rewrite) — fields
  stay editable afterward, so an admin can still correct a discrepancy without losing the member
  link. `createTestimonialDirect`'s schema already accepted an optional `memberId`; nothing server-
  side needed to change. The pre-existing `member-testimonials.tsx` (a separate component embedded
  on a member's own admin edit page, which pins `memberId` via a hidden input) is unaffected.
- **Users page audit.** `db.user.findMany` on `/admin/users` had no `where` filter at all, so a
  member-portal login account (`User.roles` containing `MEMBER`, created whenever an admin grants a
  member app/portal access) showed up as a row alongside real admin accounts — and the page's own
  copy still claimed "Admin accounts only," a leftover from before Phase 11 member logins existed.
  Fixed with `where: { roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } } }`. Verified
  directly against the real database: 6 total `User` rows, 5 admin-role, 1 member-linked — the page
  now shows exactly 5.
- **Roles & Permissions "you don't have access" bug — root cause found and fixed.**
  `toggleRolePermission` (and, it turns out, `toggleUserStatus` on the Users page — same bug, wider
  blast radius than the one page reported) both call `requireRecentAuth()`, which rejects any action
  more than 15 minutes after the JWT was **originally issued at login** — not 15 minutes of
  inactivity. Since the JWT session lasts 8 hours and nothing anywhere in the codebase ever refreshed
  `token.issuedAt`, any Super Admin who'd been logged in more than 15 minutes (the overwhelming
  majority of real usage) hit `forbidden()` on literally every permission-toggle or suspend-user
  click, with no way to recover short of signing out and back in — that's what "you don't have
  access to this" actually meant; page *viewing* itself was never the problem. Fixed by building the
  step-up re-auth flow the brief's §56 always intended but never had: `src/lib/auth/config.ts`'s
  `jwt` callback now handles a `trigger === "update"` call carrying `{ refreshAuthTime: true }` by
  bumping `token.issuedAt` to now; `src/lib/auth/reauth-actions.ts` (`confirmRecentAuth`) verifies
  the signed-in user's password against the DB; and a new client component,
  `src/components/admin/reauth-guard.tsx` (`ReauthGuard`), wraps the sensitive table on both
  `/admin/roles` and `/admin/users` — once the session is >15 minutes old it swaps the table for a
  "confirm your password" prompt, and on success calls NextAuth's `update({ refreshAuthTime: true })`
  to actually refresh the JWT before re-revealing the controls. `Date.now()` can't be read directly
  during render under this project's React Compiler rules (`react-hooks/purity`), so staleness is
  read via `useSyncExternalStore` with a 30s-interval clock subscription rather than `useState`
  +`useEffect` (which separately trips `react-hooks/set-state-in-effect`).

**Verification performed:** all real, against the live database and a real running dev server (not
just build/lint) — a temporary Super Admin test account was created directly in the DB, driven
through the actual UI with Playwright, and deleted afterward, same pattern as prior batches. Live
findings that would not have surfaced from code review alone:
1. `db.user.findMany`'s row count matched the DB's admin-only count (5) exactly, confirming the
   filter, not just that it compiled.
2. The Roles & Permissions reauth flow needed the 15-minute windows temporarily shortened (both the
   client `RECENT_AUTH_WINDOW_MS` and server `requireRecentAuth`'s default) to actually trigger
   staleness inside a test run; with that, the full loop was exercised for real — prompt appears
   once stale, a wrong password is rejected, a correct password clears the prompt, and critically, a
   real click on a permission toggle **after** reauth succeeded server-side with no `forbidden()`
   interrupt (proving the JWT was genuinely refreshed, not just the client's local state) — the
   toggle was flipped and flipped back to leave `RolePermission` data unchanged. Both temporary
   windows were reverted to their real 15-minute values before finishing.
3. First attempt at this verification gave uniformly wrong-looking results (nav items appearing
   "already removed," folded sections "missing") because a fresh Super/Central Admin login lands on
   `/admin/workspace` (Batch 4's workspace picker) before anywhere else — every check was silently
   running against that picker page, not the real target page, until the script picked "Website
   Admin" first.
`npx next build`, `npx tsc --noEmit`, and `npx eslint src prisma --max-warnings=0` all clean.

**Known issues / follow-ups:**
- Real member photos for the Roster Sheet module and the leftover "Demo Member" test row in
  Chapter 01 (both Batch 3 follow-ups) — **Resolved/decided 2026-09-15, see Batch 7 below.**

### Batch 7 — Real member photos sourced from the reference roster PDFs (2026-09-15)

**What shipped:** 126 of 127 active members now have a real `Member.photoUrl`, sourced directly
from the 3 reference chapter roster PDFs (`docs/reference/roster-sheets/`) rather than asking the
client to re-supply headshots that already existed in print form.

- **"Demo Member" test row: kept, not deleted.** Investigated first — it's linked to the same
  email this session runs as (a real login with real session history), not leftover test data as
  the Batch 3 note assumed. Asked the user directly; confirmed to keep it. It's the one active
  member with no photo (not in any roster PDF), which is expected and correct.
- **The PDFs turned out to be a single flattened raster image per page** (confirmed via
  `pdfjs-dist`: 0 extractable text items, 1 image XObject per page) — a Canva-style export, not a
  real text/vector PDF. This ruled out both text-layer extraction and OCR as the way to get
  member names per photo; instead each of the ~25 relevant pages was rendered at high resolution
  and read directly (this model's own vision), which is more reliable than OCR for names like
  "Er. NA. Vijayakrishna" anyway.
- **Row geometry turned out to be a fixed grid, not variable-height as it first looked.**
  Cropping by eyeballed pixel coordinates would have risked cutting off photos on rows with
  longer addresses (some rows wrap to 4 address lines, others to 2). Detected the true row
  boundaries programmatically instead — sampling pixel luminance down the page's empty "Give"
  column to find the alternating light-gray/white row-stripe transitions — which showed the grid
  is exactly 8 fixed-height rows per page (702px at the render scale used), identical across all
  3 chapters' PDFs (same template/designer). The photo box itself sits at a fixed 14%–24.5% of
  page width within each row band, also identical across all 3 files. Verified against several
  edge cases before running in bulk: a short-content row, a long-content row, a row's exact photo
  crop from each of the 3 different chapter PDFs, the last row of a page, and a page with only 1
  row — all cropped clean with no cutoffs.
- **Matching each cropped photo to the correct `Member` row**: transcribed every row's name from
  all 25 pages (57 + 39 + 30 = 126 people across Chapters 01/02/03), then matched against each
  chapter's real `ACTIVE` member list by normalizing both sides to lowercase alphanumeric-only
  (strips periods/spacing differences like "C.V. Jyothi Kumar" vs "C. V. Jyothi Kumar" or
  "Er.Vinoth Kumar" vs "Er. Vinoth Kumar"). Got a **100% match rate on the first pass** — 57/57,
  39/39, 30/30, with the only non-match being Demo Member (correctly not in the PDF). No fuzzy
  matching or manual disambiguation was actually needed, though the pipeline was written to
  report unmatched rows rather than guess, in case it had been.
- Cropped photos uploaded to the existing R2 bucket the same way `MediaUploadField` does
  (`images/` folder, presigned-upload's same key pattern, just called directly from a
  server-side script instead of via a presigned browser PUT), then `Member.photoUrl` set per
  matched row via a direct Prisma update.

**Verification performed:** live, not just a dry run. A `--dry-run` pass first printed every
planned (member, source page/row) pairing for review — matched 126/126 expected rows with zero
unmatched. Then the real run uploaded all 126 and confirmed via a direct DB query
(`126 of 127 active members have photoUrl`, Demo Member's is still null as expected) and a live
`curl` HTTP 200 on an uploaded image's public R2 URL. Additionally downloaded and visually
re-inspected several photos post-upload (not just pre-upload crops) — including a member from
each of the 3 chapters and one woman member (to confirm the fixed crop box isn't accidentally
tuned to a particular hairstyle/framing) — all correctly cropped and correctly attributed.
All temporary tooling (`pdfjs-dist`, `@napi-rs/canvas`, installed with `--no-save` for this task)
was uninstalled afterward; `package.json`/`package-lock.json` show no diff.

**Known issues / follow-ups:**
- Demo Member (Chapter 01) has no photo — expected, not a gap to fill.
- The Roster Sheet PDF generator (`src/lib/roster/generate.ts`, Phase 20 Batch 3) already degrades
  gracefully to an initials placeholder when `photoUrl` is null, so no code change was needed there
  for this batch to take effect — regenerating a roster now simply picks up the real photos.

### Batch 8 — Founding Members split + "Meeting Roles" renamed to "Coordinators" (2026-09-15)

**What shipped:** two small client corrections to the chapter detail admin page
(`/admin/chapters/[id]`).

1. **Founding Members split out from Leadership.** The Leadership table previously mixed
   Founder/Co-Founder in with Director/President/Secretary/Treasurer, all equally editable. Now
   a separate "Founding Members" table sits above Leadership, always Founder then Co-Founder
   (`FOUNDING_ROLE_ORDER` in `chapters/[id]/page.tsx`, matching the exact key-ordering pattern
   `src/lib/roster/generate.ts`'s PDF generator already used for its own Founder/Co-Founder band —
   no schema change needed, just the same "filter by `ChapterLeadershipRole.key`" approach). No
   Remove button on those two rows, and their role options are excluded from the Leadership
   assign-form dropdown. Enforced server-side too, not just hidden in the UI: `assignChapterLeadership`
   rejects a `FOUNDER`/`CO_FOUNDER` `roleId` and `removeChapterLeadership` no-ops on those two
   roles (`chapters/actions.ts`), since both are directly-postable server actions.
2. **"Meeting Roles" renamed to "Coordinators"**, and all 16 `RosterRole` labels changed from
   "X Host" to "X Coordinator" (e.g. "Visitor Host" → "Visitor Coordinator") per the client's
   correction — these are coordinator duties, not hosting duties. `RosterRole.key` values were
   left unchanged (`VISITOR_HOST`, etc.) — only the admin/public-facing `label` changed — so no
   migration was needed and every existing `RosterAssignment` row stayed intact. Renamed
   consistently everywhere the label/heading surfaces: the chapter detail page's section heading
   and copy, `/admin/roster-roles` (heading, copy, empty state, "Add role" placeholder), the
   `/admin/roster` generation page's link text, the sidebar nav item, and the generated Roster
   Sheet PDF's own section heading (`src/lib/roster/generate.ts`). `prisma/seed.ts`'s
   `ROSTER_ROLES` upsert was also fixed to actually apply `update` (previously `update: {}`, so a
   reseed never synced label changes to existing rows) — the live database's 16 existing rows were
   updated directly via a one-off script to match, since reseeding wasn't otherwise part of this
   change.

**Verification performed:** live, not just code review — a temporary Super Admin test account was
created directly in the DB, driven through the actual UI with Playwright (same pattern as prior
batches), and deleted afterward. Confirmed on Chapter 01's real page: Founding Members shows
Founder (Arasu Alagappan) then Co-Founder (Abi Ramanathan K) with no Remove buttons; Leadership
shows only Director/President/Secretary/Treasurer, each with Remove; the Leadership role dropdown
has no Founder/Co-Founder option; the bottom section reads "Coordinators" with labels like "Chief
Guest Coordinator"; `/admin/roster-roles` shows the same renamed list; the sidebar nav item reads
"Coordinators". `npx tsc --noEmit` and `npx eslint src prisma --max-warnings=0` both clean.

**Known issues / follow-ups:**
- Chapter 01 has zero `RosterAssignment` rows today (none of the 16 coordinator duties are
  assigned yet for any chapter) — the client said they'll fill these in themselves from the admin
  UI, not something to seed.

### Batch 9 — Chapter/Category filters on the Members admin table (2026-09-15)

**What shipped:** `/admin/members` had no way to narrow the (127-row) table by chapter or
category — client flagged this as important after seeing the live page. Added a plain GET-form
filter bar above the table (`chapterId`/`categoryId` query params, same "no client JS" convention
as `/admin/roster`'s chapter picker and the public Member Directory's search form), with a "Clear
filters" link that appears once a filter is active. The Chapter dropdown only renders for
Super/Central Admin (`scope === "ALL"`) — a Chapter Admin is already locked to one chapter, so
showing a single-option dropdown would be pointless; the category filter still applies for them.
A spoofed `?chapterId=` for another chapter is ignored server-side regardless (the existing
`getChapterScope()` result always wins over the query param — the same defensive pattern
`assignChapterLeadership` uses for `FOUNDING_ROLE_KEYS` in Batch 8 above).

**One real gotcha caught by testing, not code review**: the page also passes a `members` list into
`CreateMemberForm` for its "referred by" picker (brief §13/decision #6's manual induction picker).
The first draft filtered that from the same query as the table, which would have silently shrunk
the referral dropdown to match whatever chapter/category filter was active — wrong, since who can
be picked as a referrer has nothing to do with what the admin is currently browsing. Fixed by
fetching a second, separate `referralCandidates` query that's scope-limited (Chapter Admin) but
never filter-limited.

**Verification performed:** live, not just code review — same temporary-admin-account-via-
Playwright pattern as Batch 8 (one Super Admin, one Chapter Admin, both deleted after). Confirmed:
unfiltered table shows all 127 members; selecting Chapter 03 narrows to only Chapter 03 rows;
adding a category on top narrows further (1 row for a real chapter+category combo); "Clear
filters" returns to the unfiltered 127; a Chapter Admin never sees the Chapter dropdown and stays
locked to their own chapter's members even with a spoofed `chapterId` query param. `npx tsc
--noEmit` and `npx eslint src --max-warnings=0` both clean.

### Batch 10 — Chief Guest on Meetings, Coordinators fold-in, FAQ edit/delete, user role changes (2026-09-15)

**What shipped:** five more client corrections from a screenshot-driven review of live admin
pages. Feedback removal (the client's 5th flagged item) was explicitly deferred — see decision
below, not built this batch.

1. **Meetings: "Speaker" → "Chief Guest"**. The old `Meeting.speaker` was a plain free-text field,
   never rendered anywhere public — only ever an admin-form input. Replaced with `Meeting.
   chiefGuestId` (nullable FK to the existing `ChiefGuest` catalog already used for the homepage
   carousel and Roster Sheet PDFs — client confirmed reusing that catalog over a second, duplicate
   free-text entry point). Migration `20260915120000_meeting_chief_guest` — written by hand and
   applied via `prisma migrate deploy` rather than `prisma migrate dev`, which refuses to run at
   all in a non-interactive shell (even `--create-only`, since it still needs to prompt past the
   "1 non-null value will be dropped" warning); same Neon pooler-stripped `DATABASE_URL` workaround
   prior sessions established for CLI commands. The one real `speaker` value in the live database
   ("Mr. Manikandan" on Chapter 01's Thursday Meeting) is lost — accepted, not migrated forward,
   since there's no `ChiefGuest` row to map free text onto. Both `CreateMeetingForm` and
   `EditMeetingForm` now show a "Chief Guest" dropdown scoped to the meeting's chapter (the create
   form filters client-side as the Chapter select changes, since it has no chapter picked yet at
   mount); both actions reject a chief guest belonging to a different chapter server-side, not just
   via the dropdown's own filtering.
2. **Roster Roles page removed — folded into each chapter's own page.** Client's own words: "we are
   selecting the roles and assigning members [on the chapter page] anyway, so a separate page is
   not required." `/admin/roster-roles/page.tsx` deleted (its `actions.ts` stays — still imported
   by the moved form, just no longer a route); the sidebar's "Coordinators" nav item removed
   entirely. The role-type catalog (label + assignment count list + "Add role" form) now lives
   inside a collapsed-by-default `<details>` on `/admin/chapters/[id]`'s Coordinators section,
   titled "Manage coordinator role types" — same "global catalog, not chapter-scoped" reality as
   before, just reachable from where the client actually looks for it. `/admin/roster`'s dangling
   link updated to point at Chapters instead.
3. **FAQs: edit and delete, not just hide.** `/admin/faqs` previously had no edit — the client
   asked for editing question/answer text, or failing that, at least the ability to remove a wrong
   one. Built both: `updateFaq`/`deleteFaq` server actions, and each FAQ card is now an
   always-editable inline form (question input + answer textarea + Save), with Hide/Show and
   Delete as sibling forms below it — deliberately siblings, not nested, since HTML doesn't allow a
   `<form>` inside a `<form>` (caught this before it shipped, not after).
4. **Users: can now change an existing admin's role.** Real gap, not a misunderstanding — role
   could only ever be set at account-creation time; there was no way to promote/demote/rescope an
   existing admin short of deleting and recreating the account. New `changeUserRole` action
   (`requireRecentAuth`-gated, same brief §56 tier as suspend/permission-toggle) + inline
   `ChangeUserRoleForm` per row on `/admin/users`, replacing the old read-only Role column text.
   Guards: a user can't change their own role (shown as plain text instead of the form); can't
   demote the last remaining Super Admin (counts other Super Admins first, refuses if it'd hit
   zero); switching a role's assignments replaces only `ADMIN_ASSIGNABLE_ROLES` rows for that user
   (not a blanket `deleteMany` on all their `UserRole` rows), in case a user ever holds a `MEMBER`
   role alongside an admin one.
5. **Real bug found and fixed in `ReauthGuard`** (wraps `/admin/roles` and `/admin/users`), while
   investigating the client's "editing roles and permissions is not possible" report. `useSession()`
   has no server-hydrated initial value (`AppSessionProvider` passes no `session` prop), so on
   every fresh page load `session` is `undefined` for the ~50-100ms until its own client fetch
   resolves — and `authTime` was defaulting to `0` during that window, which read as "signed in at
   the Unix epoch," i.e. always stale. Since SSR's `getServerSnapshot` always returns `false`
   (not-stale), this produced a guaranteed hydration mismatch on every load: real content →
   password-reauth prompt → real content again, two DOM swaps in the first moment after every page
   load, not just when a session was genuinely 15+ minutes old. A click landing in that window hit
   a button about to be unmounted and never reached the server — which reads exactly like "the
   checkbox does nothing." Fixed by treating the `useSession()` loading gap itself as not-stale
   (`useIsStale` now takes a `loading` flag and short-circuits to `false` while status is
   `"loading"`), so content only ever swaps once real session data has actually proven it's old.
   Confirmed the toggle mechanism itself was always correct end-to-end (`toggleRolePermission` never
   threw, every click's `POST` reached the server and applied) — this fix removes a spurious flash
   that could eat a real click, but the bigger, more clearly load-bearing gap behind the client's
   report was almost certainly #4 above (no way to change a role at all, not a broken toggle).

**Decision: Feedback page left alone, not removed.** Asked the client directly (it's a full public
form + admin page + DB table removal, same class of action as the Ask BWF/Leads full removals) —
answer was to leave it as-is for this batch rather than remove it, despite it currently holding 0
rows. Revisit if asked again.

**Verification performed:** live, not just code review, same temporary-admin-account-via-
Playwright pattern as Batches 8/9 (Super Admin + a second target Central Admin account, both
deleted after; a temp `ChiefGuest`, a temp `RosterRole`, and temp `SiteFaq` rows created for the
Meetings/Coordinators/FAQ tests were all deleted afterward too). Confirmed via direct DB queries
(not just DOM reads, several of which raced Next.js's post-action render-commit and gave false
negatives before `waitForFunction`-style polling reads settled it): Chief Guest selection persists
across a fresh navigation and is correctly rejected across chapters; a new coordinator role type
added inline on the chapter page immediately appears in that chapter's Coordinators assign
dropdown and in `rosterRole` directly; FAQ create → edit → delete all land in the database exactly
as clicked; changing Temp Target's role from Central Admin to Chapter Admin + Chapter 01 persisted
correctly across a hard reload, self-role-change is blocked, and the chapter picker correctly
shows/hides with the role select. One real accidental side effect caught and fixed before
finishing: several `RolePermission` toggle/restore test cycles left "Central Admin: View Admin
Analytics" in a different state than it started in (this is the **live production database**, not
a separate test DB) — checked directly, restored to granted (matching the client's own screenshot
of that checkbox), and confirmed restored. `npx tsc --noEmit`, `npx eslint src prisma
--max-warnings=0`, and a full `npm run build` all clean after every change, re-run once more after
final cleanup.

**Known issues / follow-ups:**
- The lost `speaker` value ("Mr. Manikandan," Chapter 01's Thursday Meeting) — client can re-enter
  it as a real `ChiefGuest` catalog entry and re-select it on that meeting if wanted; not restored
  automatically since there's no reliable name→catalog-row mapping worth guessing at.
- Feedback page removal is still on the table if the client raises it again — see the decision note
  above.

### Batch 11 — Quick-add a Chief Guest right from the Meetings page (2026-09-15, same day)

**What shipped:** Batch 10's new Chief Guest dropdown on `/admin/meetings` only let an admin pick
from Chief Guests that already existed in the catalog — client immediately flagged there was no
way to add a new one without leaving the page. Added an inline "+ Add a new Chief Guest" reveal
(name/company/designation — the minimum viable subset of the full `/admin/chief-guests` form,
which still has photo/description/display-order for filling in later) directly under the Chief
Guest select on both `CreateMeetingForm` and `EditMeetingForm`. New `createChiefGuestQuick` action
in `chief-guests/actions.ts`, same `chief_guests:manage` gate as the full form — only rendered for
Super/Central Admin (checked via `getUserPermissionKeys()`), since that permission is deliberately
not chapter-scoped; a Chapter Admin instead sees a plain "no Chief Guests yet" note. The new guest
is auto-selected once created — both meeting forms watch their `chiefGuests` prop for an id they
haven't seen before (a `useRef` of previously-seen ids) and select it, relying on Next's own
"any Server Action completing refreshes the page's server data" behavior to get the fresh list
rather than plumbing a callback between the two forms.

**Real bug caught by testing, not code review — the exact one already documented in FAQ's own
Batch 10 note, in a new place**: the first version nested `QuickAddChiefGuestForm`'s own `<form>`
inside the meeting form's `<form>`. The browser silently reparents/breaks nested forms (`<form>
cannot contain a nested <form>`, logged to the console but not surfaced anywhere an admin would
see it) — the quick-add's Save button submitted nothing. Fixed by moving it to a sibling `<form>`
outside the main one, in both components — verified this specific failure mode live (console
error visible, DB row never created) before and the fix confirmed after (DB row created, meeting's
`chiefGuestId` correctly saved, survives a completely fresh page navigation, not just the same
tab).

**Verification performed:** live — temporary Super Admin account, quick-add flow driven through
the real UI end to end (create a Chief Guest inline on a real meeting's edit page → confirm
auto-select → Save the meeting → confirm via direct DB query that `chiefGuestId` persisted →
confirm again via a *fresh* browser navigation, not a reload of the same page, to rule out
client-side state masking a real gap). Test data (the temp Chief Guest, the temp admin account)
cleaned up afterward. `npx tsc --noEmit`, `npx eslint src prisma --max-warnings=0`, and a full
`npm run build` all clean.

### Batch 12 — Roster Sheet PDF design correction (2026-09-15, same day)

**What shipped:** the client's design review compared Batch 3's generated roster against the 3
real reference roster PDFs (`docs/reference/roster-sheets/`) and found the layout had drifted into
a plain "database export" look — this batch brings `src/lib/roster/generate.ts` back in line with
the reference's own green-and-white booklet identity, rebuilding all four sections:

1. **Cover** — full-bleed green Date/Name header and a full-bleed green Founder/Co-Founder +
   Director/President/Secretary/Treasurer band (previously a plain rect with white margins);
   Chief Guests now sit in a rounded green box with a pill title, rounded-square photo badges, and
   a "What's in it for you?" strip whose copy is a new admin-editable content block
   (`roster.whatsInItForYou`, `/admin/content` → Roster section) rather than hardcoded.
2. **Coordinators, renamed page structure to match the reference's three-column "Associates"
   layout** — President/Secretary/Treasurer Associates, each a pale-green rounded panel with a
   pill header. The reference shows the *same* RosterRole (e.g. "Meeting Coordinator") under
   different columns in different chapters, so the column can't be derived from the role label —
   added `RosterAssignment.group` (new `RosterAssociateGroup` enum: PRESIDENT/SECRETARY/TREASURER),
   set explicitly per assignment via a new dropdown on the existing assign form
   (`assign-roster-role-form.tsx`) and displayed as a new column on the chapter detail page's
   Coordinators table. Migration `20260915180000_roster_group_and_eligibility` — hand-written and
   applied via `prisma migrate deploy` (same non-interactive-shell workaround as Batch 10's
   migration), safe as a required column with no default since `roster_assignments` had zero rows
   in every environment (Batch 8's own follow-up note).
3. **Member table** — hard-capped to exactly 8 members/page (was fitting ~12/page by letting row
   height grow with content), matching the reference's own density and preserving generous Give/Ask
   handwriting space. Row height is now a fixed `available-height / 8` slot per page instead of
   content-driven; long name/company/address/contact lines truncate with an ellipsis instead of
   wrapping, so one long address can never overlap the next row (client's own explicit ask). Photos
   are larger and rounded-square (matching the reference's own frame, not the old circular crop).
   Same fix applies to Coordinators/cover photos. Added `Member.rosterEligible` (default `true`) —
   status `ACTIVE` alone wasn't a safe "belongs on a printed roster" signal (a real "Demo Member"
   seed row was still `ACTIVE` in production); flipped to `false` for that one row via a one-off
   script rather than deleting it, since deleting test data was a separate call the client didn't
   ask for this batch.
4. **Final page** — consolidated Visitor Self-Introduction, Open Categories, and the Pledge +
   Visitor Feedback QR onto **one** green branded page (previously spread across 3 separate pages).
   Open Categories tries progressively more columns (3→6) and shrinks its font before falling back
   to a hard clip against its own panel — the query behind it (`getOpenCategoryNames`) was already
   correct (active categories minus this chapter's occupied ones), but the *data* has ~150
   near-duplicate entries (Architect-1/2/3, multiple waterproofing/interior variants); deduping the
   Category master is a content decision left to the client to do themselves in `/admin/categories`,
   not guessed at here — the clip just guarantees the page never visually breaks in the meantime.
   The invitation-flyer page (only ever present on one of the three reference chapters) was removed
   entirely per the client's explicit correction — it's a separate promotional asset, not part of
   the roster booklet; `RosterData` dropped the now-unused `meetingTitle`/`meetingStartsAt`/
   `meetingVenue`/`meetingAddress`/`registrationFeeText` fields along with it.

**Real bug caught only by rendering actual output, not code review**: two different `.text()` calls
in the final page (the Pledge paragraph lines, and the `www.buildersworldforum.com` footer sitting
right at the bottom margin) had no explicit `height` option. pdfkit treats an unbounded multi-line
`.text()` call as flowing content — even with absolute x/y — and silently appends a trailing blank
page once it decides the block might overflow, regardless of whether anything is actually drawn on
it. This produced an 11-page-of-content PDF that actually shipped as 12 pages, with a fully blank
page 12 — invisible unless you open the real file and check `page_count`, not something a visual
diff of the content pages would catch. Fixed by giving every multi-line `.text()` call on that page
an explicit `height`, which also fixed a related visible bug: the Chief Guest box's fixed guessed
height (190) let the guest name card and the "What's in it for you?" strip overlap for real data;
replaced with a derived `boxHeight` built from the same offsets used to place its own content
(the exact pattern this file's Batch 3 invitation-flyer function — now removed — had already
established for this class of bug). Also fixed Founder/Co-Founder rendering in query order instead
of a fixed order, which could print Co-Founder before Founder depending on the database's own
row order — now sorted via the same `FOUNDING_ROLE_ORDER`-style fixed array the chapter detail
admin page already uses.

**Verification performed:** rendered real generated PDFs to page images (PyMuPDF) and read them
directly, not just diffed code — against Chapter 01's actual 57 roster-eligible members (58 minus
the now-excluded Demo Member), its real Chief Guest, and its real ~150-entry (undeduplicated)
category list, confirming: exactly 8 members/page across 8 pages with correctly blank trailing
rows on the last page and sequential "ROSTER PAGE - N" numbering; the final page holds at one page
with the categories block gracefully shrinking/clipping rather than overlapping the Pledge box
below; page count is exactly 11, matching the reference PDFs' own page count. Separately created 12
temporary `RosterAssignment` rows across all three groups (the table was empty in every real
chapter) to verify the Coordinators page's three-column bucketing renders correctly, then deleted
them. `npx tsc --noEmit`, `npx eslint src prisma --max-warnings=0`, and a full `npm run build` all
clean.

**Known issues / follow-ups:**
- The Category master's ~150 near-duplicate entries (client's own explicit finding) are not
  deduplicated by this batch — the client chose to handle that themselves in `/admin/categories`.
  Until then, the Open Categories block on real chapters will lean on its column-shrink/clip
  fallback and may truncate some longer names — expected to resolve on its own once the category
  list is cleaned up, not a layout bug.
- Every chapter's `RosterAssignment` table is still empty in production (same gap Batch 8 noted) —
  the new `group` field has no live data to exercise yet; verified only via temporary rows.

### Batch 13 — Roster Sheet becomes an interactive, per-meeting management system (2026-09-16)

**What shipped:** the client asked for the Roster Sheet page to stop being a "pick a meeting,
download a PDF" generator and become a full on-page roster manager — scores, automatic ranking,
per-meeting open-category selection, and a Notes-column toggle, all saved against a specific
`Meeting` and reviewable on the website before the PDF is ever downloaded (the PDF is now the
final output of a save, not the primary feature).

- New models: `Roster` (one per `Meeting`, `notesEnabled` toggle, `chiefGuests`/`openCategories`
  implicit many-to-many — same pattern as `Blog.tags`/`BlogTag` — plus `savedAt`, null until the
  admin explicitly saves) and `RosterScore` (one row per `Roster`+`Member` in the "All Other
  Members" section only — Chief Guest/Founding Team/Leadership Team/Coordinators are never scored,
  they keep their existing fixed/catalog order). Migration
  `20260916075029_roster_scoring_and_config`, applied cleanly via `prisma migrate dev` against the
  real dev database — no shadow-DB workaround needed this time.
- `src/lib/roster/manage.ts` — `getRosterWizardData(meetingId)`, computed once server-side and
  handed to a client wizard as plain data, same precedent as the Phase 7 `/apply` wizard. Sections
  mirror the client's exact ordering: Chief Guest (from the chapter's `ChiefGuest` catalog, default
  = `Meeting.chiefGuestId` if set), Founding Team (`ChapterLeadership` `FOUNDER`/`CO_FOUNDER`,
  same `FOUNDING_ROLE_ORDER` convention as `/admin/chapters/[id]`), Leadership Team (the rest of
  `ChapterLeadership`), Coordinators (`RosterAssignment`, unchanged three-column grouping), and
  All Other Members — every other `ACTIVE`/`rosterEligible` member, explicitly **excluding** anyone
  already shown in the three sections above (client's own call: a member appears in exactly one
  section, never twice).
- **Score carry-forward (client's own call):** a brand-new meeting's roster doesn't start every
  member at 0 — each member's score pre-fills from their most recent *other* scored meeting in the
  same chapter, as a starting point the admin then adjusts. Fetched and reduced to "most recent hit
  per member" in JS (a two-hop relation sort — `RosterScore` → `Roster` → `Meeting.startsAt` — isn't
  something a single Prisma `orderBy` expresses cleanly), same "fine at this scale" precedent as
  `findMatchingCompany`'s JS-side company dedup (Phase 7). The **display order** of a never-saved
  roster still falls back to `joinedAt` (score-sorting only happens once an admin actually clicks
  Save, per requirement 4) — verified live this is exactly what happens: a second meeting's members
  showed the first meeting's carried-forward score *values* in `joinedAt` order, then correctly
  re-ranked by score once saved.
- `src/app/admin/(dashboard)/roster/[meetingId]/actions.ts` — `saveRoster()`, one transaction:
  upserts `Roster` (notes toggle, chief guests, open categories — re-validated server-side against
  the meeting's own chapter, never trusting client-submitted ids), stable-sorts the submitted
  members by score descending (ties keep their submitted relative order for free, since
  `Array.prototype.sort` is stable), and writes `RosterScore` rows.
- `src/components/admin/roster-wizard.tsx` — one client component owning steps 3–7 (Manage
  Members & Scores, Select Open Categories, Configure Notes, Review & Save, Download PDF) off the
  one server-computed payload; steps 1–2 (chapter, meeting) stayed plain GET-form/link pages, same
  as before. Back/Next never lose unsaved edits (all in React state until Save Roster is clicked).
  The Review step previews a live "what Save will persist" projection (same stable-sort-by-score
  the server runs) rather than showing stale last-saved data while the admin is mid-edit. Download
  PDF stays disabled until the roster has been saved at least once **and** there are no edits since
  (client-side dirty check against a snapshot taken at last save) — satisfies the brief's "changes
  must be saved before downloading the updated PDF" literally.
- `/admin/roster` (step 2) now lists **every** meeting for the chapter, not just upcoming/scheduled
  ones, tagged Saved/Not started, so a past meeting's roster can be reopened — and a
  "+ Create a new meeting" link goes to `/admin/meetings?chapterId=…` (client's own explicit
  preference over duplicating that form inside the wizard); `CreateMeetingForm` now accepts a
  `defaultChapterId` to preselect that dropdown on arrival.
- `/api/admin/roster` (PDF download) no longer computes anything live — it reads the persisted
  `Roster`/`RosterScore` rows straight through, and 409s with a friendly message if the roster was
  never saved. `src/lib/roster/generate.ts` gained a `notesEnabled` flag (a third blank
  fill-in-by-hand column alongside Give/Ask, same treatment, not admin-typed text) and now renders
  members in the saved `RosterScore.order`, not `joinedAt`.
- `src/lib/roster/static-content.ts` — the Pledge and Guest Self-Introduction wording, extracted
  out of `generate.ts` into one module shared by the PDF and the wizard's on-page preview so they
  can never drift apart (requirement 8: "the preview must closely match the final PDF").
- **Checked the "BWF rules and regulations" / "oath" requirement against the actual 3 reference
  PDFs before building anything** (they're scanned images with no extractable text, so read
  page-by-page as rendered images): no such section exists in any of the 3 references — only the
  Pledge and the Self-Introduction format. Per the client: the Pledge stands in for "oath and
  pledge," and nothing was invented for "rules and regulations" since no source wording exists for
  it.
- **Real bug caught only by re-reading the reference images at full resolution, not by reusing the
  prior batch's transcription as-is**: the Self-Introduction block's opening line — "Dear Guest,"
  (or "Dear Visitor," on Chapter 1's own version) — was present on every one of the 3 references but
  had been silently dropped from `generate.ts` since Batch 3. Restored it and standardized the
  heading on "BWF – Guest Self Introduction Format" (2 of the 3 references, and the client's own
  phrasing) with the salutation now correctly rendered above the instructions line.

**Real bug caught only by testing against real production data, not a handful of test rows**: the
first save-roster pass against Chapter 01's real 51 non-leadership members took long enough
(one `upsert` per member inside a single interactive transaction, each a real network round-trip to
Neon) that a save genuinely in progress looked like a broken "Download PDF" button — the client-side
save had not actually finished by the time a quick check looked at it. Fixed by replacing the
per-row upsert loop with delete-all-then-`createMany` (3 queries total regardless of member count,
not N+1) — same safe swap as any other table where no other row references `RosterScore.id` by
foreign key. Re-measured live: ~2.8s for 51 members end-to-end, versus previously exceeding several
seconds unmeasured before the fix made it look stuck.

**Verification performed:** full real pass via Playwright against a real production build
(`next build && next start`) and the live database, logged in as the real Super Admin, against
Chapter 01's actual 51 eligible members (not seeded/fabricated test rows): set 5 real members'
scores (three distinct, two intentionally tied) through the actual UI, selected exactly 2 of the
chapter's 89 real open categories, enabled Notes, clicked Save Roster, and confirmed — via a full
page reload, not just in-memory state — the saved scores, the correctly re-ranked order (descending
by score, the tied pair keeping their original relative order), the 2 selected categories, and the
Notes toggle all reloaded exactly as saved. Downloaded the real PDF and rendered every page with
PyMuPDF: the member table's first page matches the saved ranking exactly with a working Notes
column; the final page shows exactly the 2 selected categories and the corrected Self-Introduction
wording; the cover correctly shows the meeting's own default Chief Guest and the real
Founder/Co-Founder/Director/President/Secretary/Treasurer band, all unchanged from before this
batch; the Coordinators page correctly shows its real empty state (Chapter 01's
`RosterAssignment` table is still empty in production, same known gap Batch 8/12 already flagged).
Separately verified isolation and carry-forward: created a second real meeting via
`/admin/meetings?chapterId=…` (confirmed the chapter dropdown arrived preselected), confirmed its
roster opened with the first meeting's saved scores carried forward, edited and saved it, and
confirmed via direct database query that the first meeting's saved `Roster` (`savedAt` and every
score) was completely untouched. All temporary meetings/rosters created during verification were
deleted afterward. `npx tsc --noEmit`, `npx eslint src prisma --max-warnings=0`, and `npm run
build` all clean throughout.

**Known issues / follow-ups:**
- Give &amp; Ask stays blank fill-in-by-hand space on both the on-page table and the PDF, same as
  every reference roster — the brief calls only Score "editable"; not a gap, a deliberate read of
  the requirement.
- Chapter Admin's chapter-scoped access to the new `/admin/roster/[meetingId]` route was not
  independently re-verified with a second real Chapter Admin login this batch — reasoned from the
  already-proven-correct `requireChapterAccess` pattern shared with every other roster route
  instead, same gap Batch 3 flagged for the original generation route.
- The save round-trip (~2.8s for 51 members) is real network latency to Neon across 3 sequential
  queries, not further optimized this batch — fine at today's chapter sizes, worth revisiting only
  if a chapter's member count grows substantially.

### Batch 14 — Roster Sheet correction: overall Notes box, Founding/Leadership Team duplicated into All Other Members (2026-09-16, same day)

**What shipped:** two client corrections to Batch 13's brand-new interactive roster system, caught
before either shipped to production.

1. **Notes is one overall box, not a per-member column.** Batch 13 had put a third blank column
   next to Give/Ask on every member row when the toggle was on — the client's actual intent was a
   single blank Notes area for the whole roster, printed once the full member list is done, right
   before the Guest Self-Introduction section. `renderMemberTable` (`src/lib/roster/generate.ts`)
   reverted to always exactly two blank columns (Give/Ask); `renderFinalPage` gained a
   `notesEnabled`-gated Notes box (pill header, bordered, ~74pt tall) at the very top of the final
   page, ahead of the Self-Introduction block. Because the Open Categories panel's height was
   already derived from whatever space remains above the Pledge box (Batch 12's own fix), pushing
   the starting `y` down for the new Notes box needed no other change — the existing
   shrink-as-needed budget absorbed it automatically. Mirrored on the wizard's Review-step preview
   (`src/components/admin/roster-wizard.tsx`): no Notes column on either the Manage or Review
   tables, a standalone "Notes" box rendered right before the Self-Introduction preview.
2. **Founding Team and Leadership Team members are no longer excluded from "All Other Members"** —
   reversing Batch 13's own planning decision. The client's reasoning: those members are still
   shown first in their own section, but they're also regular members with their own Give/Ask, so
   their name and score belong in the general scored list too, duplication and all. Coordinators
   are unaffected — still shown only in their own section, still excluded from the scored list
   (not mentioned in this correction, and the client confirmed everything else was fine as built).
   `getExcludedMemberIds()` (`src/lib/roster/manage.ts`) now only excludes `RosterAssignment`
   (Coordinator) member ids, not `ChapterLeadership` ones — a single-function change that both the
   wizard loader and `saveRoster`'s server-side re-validation already shared, so nothing else
   needed touching.

**Verification performed:** re-ran the real Playwright pass against Chapter 01's actual data (57
eligible members, 6 real leadership rows, 0 coordinators): confirmed the All Other Members table
grew from 51 to 57 rows and now genuinely contains the real Founder ("Arasu Alagappan") and
Co-Founder ("Abi Ramanathan") by name; confirmed neither the Manage-step nor Review-step table has
a Notes column under any circumstance; confirmed a standalone "Notes" heading renders ahead of the
Guest Self-Introduction heading in DOM order when the toggle is on. Saved for real (57
`RosterScore` rows persisted) and downloaded the actual PDF — rendered every page with PyMuPDF and
confirmed visually: the member table pages show only Give/Ask (no third column), and the final page
shows a clean "Notes" pill box sitting above the Self-Introduction block, with Open Categories and
the Pledge still fitting on the same single page with no overlap. Test roster deleted afterward.
`npx tsc --noEmit`, `npx eslint src prisma --max-warnings=0`, and `npm run build` all clean.

**Known issues / follow-ups:** none new — same three follow-ups as Batch 13 above still apply.

### Batch 15 — Roster Sheet correction: Pledge box sized to content, Notes moved below it and enlarged (2026-09-16, same day)

**What shipped:** three more corrections, this time driven by the client reviewing an actual
rendered final page screenshot rather than a description.

1. **Pledge box no longer stretches to fill leftover page space.** It had been sized as
   `pageBottom - y - bottomFooterPad` — whatever was left after Open Categories, which could be a
   lot of empty green padding around 4 short lines of text. Both the Pledge box and Open
   Categories' available-height budget now derive from the Pledge's actual content height
   (`pledgeBoxHeight`, computed once up-front from real text measurements — line-wrapped height
   plus a fixed `pledgeVerticalPad`), the same "size to content, don't stretch" treatment Batch 12
   already gave Open Categories itself.
2. **Notes moved to below the Pledge box** (previously above the Self-Introduction block, per the
   client's own earlier instruction — corrected after seeing it rendered) and made deliberately
   larger: it now fills whatever real space remains down to the footer, with a `minNotesHeight`
   (90pt) floor reserved in Open Categories' own budget so a long category list can never push it
   below that floor or off the page. Mirrored in the wizard's Review-step preview
   (`src/components/admin/roster-wizard.tsx`): Notes box now renders after the Pledge block, not
   before Self-Introduction.
3. **Real bug caught only by rendering the fix, not by reading the diff**: hoisting the Pledge
   height calculation earlier in the function (needed so Open Categories' budget could reference
   it) set the font with `doc.fontSize(pledgeFontSize)` but never the font *family* — at that point
   in the function the family carried over as regular Helvetica from the member table, while the
   actual render later happened right after the Pledge heading's `Helvetica-Bold` call, which also
   only reset size, not family. Measuring in regular weight and rendering in bold (wider glyphs)
   meant the real rendered text needed more lines than the height budget allowed for, and every
   Pledge line was silently clipped mid-sentence with no ellipsis. Fixed by explicitly setting
   `doc.font("Helvetica")` at both the measurement and render call sites instead of relying on
   whatever family happened to carry over. A second, related bug from the same root architecture
   change — forgetting to reserve `minNotesHeight` in Open Categories' budget — let a real long
   category list push the Notes box (and its pill title) past the page bottom, triggering pdfkit's
   documented silent-trailing-blank-page behavior (a 12th page with just a floating "Notes" label);
   fixed by adding that reservation, verified by re-testing with both the chapter's real ~150-entry
   category list and a deliberately small 2-category selection.

**Verification performed:** rendered the real final page with PyMuPDF against Chapter 01's actual
current category list (grew to ~150 entries since Batch 13's testing) with Notes enabled — confirmed
a single page, Pledge text fully visible and wrapped correctly (no clipping), Pledge box tightly
fit around its 4 lines with no dead space, and a Notes box beneath it sized close to its 90pt floor
(since the long category list used most of its own budget). Re-tested with only 2 categories
selected — confirmed the Notes box grew dramatically bigger (filling essentially the whole
remaining page), proving the "give leftover space to Notes, not Pledge" behavior actually works
both directions, not just in the cramped case. Confirmed the on-page Review-step preview's DOM
order (Notes heading after the Pledge heading, not before Self-Introduction). Test rosters deleted
afterward. `npx tsc --noEmit`, `npx eslint src prisma --max-warnings=0`, and `npm run build` all
clean throughout.

**Known issues / follow-ups:** none new.

---

## Phase 21 — Marketing Module: Social Media Scheduling & Publishing (Batch 1)

**Status:** Batch 1 of 3 complete (schema + admin UI). Batches 2 (OAuth connect flows) and 3
(cron-driven publish worker) are blocked on the client registering a Meta developer app, a Google
Cloud project, and a Pinterest developer app — see the Connected Accounts follow-up below.

**Why this is its own phase, not folded into Phase 20:** a new, unrelated client brief (2026-09-16)
— "add a Marketing page that centralizes social media content management, scheduling, and
publishing to Instagram/Facebook/YouTube/Pinterest" — not a correction to the admin-restructure
brief Phase 20 covers. Same precedent as Leads (Phase 15) and Member Article Submissions
(Phase 16): a new feature area gets its own phase number in this project's own build-order
numbering, even though the brief itself doesn't name a phase for it.

**What shipped:**
- Before any code: researched and verified current (Sept 2026) official API requirements for all
  four platforms, and compared direct integration against third-party aggregators (Ayrshare,
  Postiz, Blotato, Publer) — see `docs/ARCHITECTURE.md`'s Marketing module section for the full
  writeup. Client explicitly chose direct integration to avoid recurring aggregator fees ($149+/mo)
  once informed that Meta and Google both offer a no-App-Review path for a single organization
  posting only to its own accounts.
- Schema: `MarketingContent` (the video, uploaded once), `PlatformConnection` (one row per
  platform, seeded NOT_CONNECTED — real OAuth token fields land in Batch 2), `ScheduledPost` (one
  row per content×platform, carrying that platform's own caption/title/hashtags/board/destination
  link and `scheduledFor`), `PublishAttempt` (audit trail for Batch 3's retry/idempotency needs).
  `MarketingContent → ScheduledPost` is `onDelete: Restrict`, not `Cascade` — deleting content
  can't silently erase real Publishing History (same pattern as Company↔Member).
- New `marketing:manage` permission (Super/Central Admin blanket, not chapter-scoped — this is a
  BWF-wide brand function, not a per-chapter one), new `marketingVideo` storage kind
  (`src/lib/storage.ts`, 2GB cap vs the existing `video` kind's 200MB — sized for Meta's/
  Pinterest's own stated Reel/video-Pin ceilings, not a member-profile clip).
- Admin UI at `/admin/marketing` (Dashboard — tile counts, upcoming posts), `/library` (upload +
  content list), `/library/[id]` (per-content detail: scheduled posts, the Schedule Posts composer
  — platform checkboxes, a common-caption-with-override field, per-platform settings matching
  brief §6 exactly, Publish Now or IST date/time, Confirm & Schedule), `/calendar` (month-grid,
  day/week toggle deliberately deferred as a fast-follow), `/history` (published/failed posts,
  Retry), `/connected-accounts` (read-only status view — real Connect flow is Batch 2).
- IST handling (`src/lib/marketing/constants.ts`) is a fixed +05:30 offset conversion, not a
  timezone library — IST has no DST, so this doesn't need one.

**Batch 1's honesty boundary, explicit:** `ScheduledPost` rows created now persist real schedule
intent (status `SCHEDULED`, correct `scheduledFor`), but nothing actually publishes yet — no cron
worker exists to read them. "Publish Now" is represented as `scheduledFor = now`, not a synchronous
publish call. Same precedent as the old Weekly Report cron (Phase 9), which shipped its settings/
recipients UI a full phase before the sender existed, rather than half-building automation. The
Dashboard and every schedule-affecting page say this plainly when no platform is connected.

**Verification performed:** `npm run build`/`lint`/`typecheck` clean throughout. Ran a real
production build (`next build && next start`, not dev mode — this project's own standing
discipline) and drove the entire flow with Playwright against a real (non-seed) database, as
Super Admin: logged in, confirmed the Marketing sidebar link and workspace scoping, uploaded a
real file through the browser (a real presigned-PUT round trip to R2 — not mocked), confirmed it
appeared in the Content Library, opened its detail page, selected Instagram (Publish Now) and
YouTube (a real future IST date/time), filled independent captions per platform, clicked Confirm &
Schedule, and confirmed both rows appeared with the correct status/timestamps. Confirmed the
Instagram post appeared on today's calendar cell and the YouTube post on the correct December
cell. Edited the YouTube post's fields, cancelled the Instagram post (with the confirm dialog),
and confirmed the content detail page reflected both changes live. Confirmed Publishing History
correctly showed its empty state (nothing published/failed yet — by design, nothing publishes in
Batch 1) and Connected Accounts correctly listed all 4 platforms as Not Connected. All test content
and scheduled posts deleted afterward via direct DB query (confirmed zero rows remaining).

**Two real bugs found only by testing live, not by type-checking or code review:**
1. `POST /api/uploads`'s request-body validation (`src/app/api/uploads/route.ts`) hardcoded
   `z.enum(["image", "pdf", "video"])` for the upload `kind` — predates this phase, and the new
   `marketingVideo` kind wasn't in it, so every real upload attempt 400'd with a generic "Invalid
   request." despite `src/lib/storage.ts`'s `MEDIA_KINDS` already knowing about it correctly and
   the client-side `MediaUploadField` component being updated too. `npm run typecheck` had no way
   to catch this — the string literal wasn't type-checked against `MediaKind`. Fixed by deriving
   the zod enum from `Object.keys(MEDIA_KINDS)` instead of hand-copying the list, so a future new
   kind can't silently repeat this. Worth remembering: any hardcoded literal union that's supposed
   to mirror another module's exported type is a latent bug waiting for the next kind/variant to be
   added — derive it, don't copy it, wherever that's possible.
2. The `PlatformConnection` seed block was added to `prisma/seed.ts` *after* the one `npx prisma db
   seed` run already made this session (which only had the new `marketing:manage` permission in it
   at the time) — so the 4 platform rows Connected Accounts depends on didn't actually exist yet
   despite the seed code being correct and committed. Caught by the live verification script
   reporting 0 connection rows instead of the expected 4, not by reading the seed file. Re-running
   `npx prisma db seed` (safe — every seed operation in this file is an idempotent upsert) fixed it
   immediately. Worth remembering: editing a seed file doesn't retroactively apply to a database
   that was already seeded before the edit — a seed change needs its own explicit re-run, the same
   way a schema change needs its own explicit migration.

**Known issues / follow-ups:**
- Connected Accounts' "Connect" buttons are inert (`disabled`) until Batch 2 registers a real OAuth
  flow per platform — blocked on the client creating a Meta developer app, a Google Cloud project,
  and a Pinterest developer app (see `docs/ARCHITECTURE.md` for exactly what each involves).
- The Publishing Calendar ships as a month-grid only; day/week views are a straightforward
  fast-follow on the same data (`byDate` bucketing already exists), deliberately not built this
  batch to keep scope contained.
- Pinterest's board picker is a free-text field (`boardName`) for now — a live board list needs a
  real Pinterest connection (Batch 2/3) to fetch from.
- No cron worker exists yet — `ScheduledPost` rows past their `scheduledFor` time just sit as
  `SCHEDULED` until Batch 3 adds the polling worker described in `docs/ARCHITECTURE.md`.

---

## Phase 22 — QR Code, Attendance & Payment System

**Status:** Complete

**What shipped:** the client's "BWF Admin Panel: QR Code, Attendance & Payment System" spec
(2026-09-17), which explicitly supersedes an earlier attendance-only brief. Three linked, separately
permissioned admin pages, one meeting-specific self-check-in flow, and independent attendance/
payment records per the spec's own non-negotiables.

- Schema: `Meeting` gained `attendanceQrToken` (unique, generated once and reused), a manual
  `attendanceRegistrationOpen` toggle, and an optional `checkInOpensAt`/`checkInClosesAt` schedule.
  New `Attendance` (`@@unique([meetingId, memberId])` — enforces "one record per member per
  meeting" at the database level; `correctedByUserId`/`correctionReason`/`correctedAt` for the
  spec's mandatory-reason correction requirement, alongside a full `AuditLog` trail via
  `logActivity`) and `Payment` (independent of Attendance — nullable `attendanceId` link only,
  never the reverse; `monthsCovered` as `[{month,year}]` JSON, `amountPaidInr` as a real
  `Decimal(10,2)` — the first actual money field in this schema, everywhere else money has been
  display-only text; `idempotencyKey` unique constraint for "prevent duplicate payment submissions
  from repeated clicks or retries"; `overlapsApprovedCoverage` flag, never an auto-reject).
  Migration `20260917000000_qr_attendance_payment_system`, applied via the documented non-
  interactive `migrate diff` → `db execute` → `migrate resolve --applied` path (this environment's
  `prisma migrate dev` refuses to run non-interactively at all — a different failure mode from the
  shadow-DB issues recorded earlier in this log, same safe workaround family).
- New permissions: `attendance:manage` (QR generation + Attendance Management, chapter-scoped via
  `requireChapterAccess` exactly like `meetings:manage`), `payments:view` (Payment Management,
  same chapter-scoping — "Chapter admins may view only records permitted by their role"), and
  `payments:approve` (Approve/Reject/Request Clarification — **blanket-only, deliberately never
  chapter-scoped**, granted by default only to Super/Central Admin). The spec names a possible
  "Accounts Team" approver but this app has no such role; rather than inventing a fifth Role (which
  ripples into `ADMIN_ROLE_KEYS`, the workspace picker, and login role acceptance), "explicitly
  authorised" is realized the same way every other explicit grant works here — Super Admin assigns
  `payments:approve` to whichever role needs it via the existing `/admin/roles` permission matrix.
- `/admin/qr-codes` → `/admin/qr-codes/[meetingId]`: chapter→meeting picker (same pattern as
  `/admin/roster`), then View (inline `<img>` from a new `/api/admin/qr-codes/[meetingId]` PNG
  route, via the `qrcode` package), Download (`?download=1` sets `Content-Disposition`), Print (a
  `window.print()` button plus a scoped `@media print` rule so only the QR area prints), Open
  Registration Link, and Open/Close Registration + optional check-in window controls.
- `/admin/attendance` (meeting-wise: expected/Present/Absent/percentage, per-member correction with
  a mandatory-reason inline form, "Close Meeting & Mark Absentees" which backfills real `ABSENT`
  rows for every expected member without a check-in — `src/lib/attendance/manage.ts`'s
  `closeMeetingAttendance()`) and `/admin/attendance/members` (member-wise history, chapter/
  meeting/member/date-range/status filters, excludes meetings before `Member.joinedAt`). Excel
  export at `/api/admin/exports/attendance`.
- `/admin/payments` (summary cards — submitted/approved/pending/rejected value, pending never
  counted as verified; filters; Approve/Reject-with-reason/Request-Clarification, rendered only for
  callers holding `payments:approve`) and `/admin/payments/members` (submissions history plus a
  month-by-month grid distinguishing Approved/Pending/"No approved payment recorded" — never a
  fabricated "Unpaid," per the spec). Excel export at `/api/admin/exports/payments`.
- Member check-in: `/member/checkin/[token]` (inside the existing `(portal)` route group, so
  Phase 11's member auth/role gating and `proxy.ts` redirect-with-`from` apply for free). One
  `checkIn()` server action, one transaction, covering both spec outcomes: creates the `Attendance`
  row (or flips a stale backfilled `ABSENT` to `PRESENT` on a genuine late self-check-in, but never
  overwrites an admin's explicit correction), and — independently — creates the `Payment` row when
  the member reports one, catching a unique-constraint hit on `idempotencyKey` as "already
  submitted" rather than an error. New `paymentProof` storage kind (`src/lib/storage.ts`) accepting
  both image and PDF content types, since the spec's evidence field is "screenshot, receipt or
  PDF" — the one media kind in this app that isn't single-format.
- **Deliberate deviation from the spec's literal wording, flagged on the schema and pages
  themselves**: Step A says to show "a searchable dropdown of members in that chapter," but the
  same paragraph also requires "existing member login... choosing a name alone is insufficient."
  Building a second, weaker verification mechanism alongside a dropdown would have satisfied the
  letter while missing the point. Check-in instead requires the member's existing member-portal
  login (Phase 11) — the session directly identifies the member, so there is no name-picking step
  at all; name/category/chapter are read straight from their own `Member` row. Confirmed with the
  user before building (recommended option, chosen over a shared-kiosk-plus-PIN alternative and
  over a no-verification dropdown). One real consequence: a member with no portal login yet cannot
  self-check-in via QR — an admin can still mark them Present/Absent directly from Attendance
  Management.
- **Historical Excel migration (spec §5) deliberately deferred**, per the user's own choice when
  asked — no agreed legacy export format/file exists yet to build against; this app's own long-
  standing pattern (old site URLs, domain/DNS access, etc.) is to wait for the real input rather
  than build against a guessed shape.

**Verification performed:** `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0
vulnerabilities (`qrcode` + `@types/qrcode` added cleanly). Ran a real production build (`next
build && next start`) and drove the entire flow live with Playwright against the real production
database — not seed/local data: logged in as the real Super Admin, generated a QR for a real
scheduled chapter meeting, opened registration, then — in a separate browser context — signed in
as a member-portal account and completed a real self-check-in (no payment), confirmed the "already
checked in" branch on a revisit, then submitted a real payment (₹1,500, one month, a real file
uploaded through the browser to R2 via presigned PUT — not mocked). Confirmed live, back as Super
Admin: the Attendance page showed the member Present with a real check-in timestamp, the Payments
page showed the submission Pending Approval, Approve flipped it to Approved with the reviewer
recorded, and a mandatory-reason correction produced the "(corrected)" badge. Confirmed via direct
database query that `AuditLog` captured every one of these actions.

**A real incident during this session's own verification, caught and fixed, worth recording
exactly because it shows the cleanup discipline mattered**: the correction test's blind "click the
first Correct button" hit the *first row in the real attendance table* rather than the intended
test member — which, for a real chapter's real member roster sorted alphabetically, was an actual
board member ("Abi Ramanathan K"), not the throwaway test account. This left one real member
incorrectly marked Absent on a real meeting with a fake reason for a few minutes. Caught by
querying the database directly rather than trusting the on-page assertion, and fixed by deleting
that specific stray `Attendance` row (not the audit log entry, which stays — an accurate record of
what actually happened, same "never scrub the trail" precedent as the Phase 2 admin-suspend
incident). Also cleaned up: the test member's own real `Attendance`/`Payment` rows, closed
registration back to its default state, and restored a real user's password to its original hash
after a temporary reset for the test login (the temp hash's session was also invalidated via
`sessionVersion`) — the change was made only after explicit in-conversation approval, since
altering a real credential (even reversibly) is exactly the kind of action this project's own
safety discipline holds should never be pushed through silently.

**Known issues / follow-ups:**
- Historical attendance/payment data migration (spec §5) — not started; needs a real legacy export
  file before any importer can be built against it, see above.
- "Exclude meetings before joining or after leaving the chapter" (member-wise attendance view) only
  half-applies: this schema has no "left the chapter on" date, so a member who has since left their
  chapter (gone `INACTIVE`) has no exclusion boundary on the far end — only `Member.joinedAt` is
  enforced as a floor. Revisit if chapter-membership history ever becomes its own tracked concept.
- No confirmation email is sent for check-in or payment-status changes — consistent with this
  project's standing precedent (Phase 7/8/9 all deferred email to Phase 13's automation rather than
  half-building it per-feature), but worth naming since Phase 13 already exists and could pick this
  up as a small addition rather than a new phase.
- `payments:approve` has no "Accounts Team" role to grant itself to yet — see the schema note
  above; the mechanism (grant via `/admin/roles`) is real today, only the named role doesn't exist
  until the client actually asks for one.
- Chapter Admin's chapter-scoped access to `/admin/qr-codes`, `/admin/attendance`, and
  `/admin/payments` was reasoned from the already-proven `requireChapterAccess`/`getChapterScope`
  pattern shared with Members/Meetings/Visitors/Roster, not independently re-verified with a second
  real Chapter Admin login this session — same category of gap Batch 3/13 flagged for Roster.

---

## Phase 23 — Visitor Management System (Visitors QR / Visitors Attendance / Visitors Payment)

**Status:** Complete

**What shipped:** the client's "BWF Visitor Management System" spec (2026-09-18) — three linked
admin pages mirroring Phase 22's member-facing QR/Attendance/Payment system, but for walk-in
visitors, deliberately named **Visitors QR**, **Visitors Attendance**, and **Visitors Payment**
(the client's own instruction, on top of the spec) so they're never confused with the existing
member-only "QR Codes"/"Attendance"/"Payments" nav entries.

- Schema: three new models — `VisitorProfile` (identity, deduped by normalized `phone` — "verified
  identifiers... never merge by name alone" — via `normalizePhone()`/`findOrCreateVisitorProfile()`
  in `src/lib/visitors/manage.ts`), `VisitorAttendance` (one row per profile-at-one-meeting;
  submitting the public QR form *is* the check-in, since no separate advance-registration step
  exists yet; `@@unique([meetingId, visitorProfileId])` enforces "no duplicate attendance," same as
  `Attendance`), and `VisitorPayment` (simpler than the member `Payment` — no
  `monthsCovered`/`numberOfMonths`, since the spec explicitly says visitor meeting fees need no
  subscription-month selector). Deliberately **not** a reuse of the existing `Visitor` model, which
  is a completely different Phase 8 concept (pre-meeting interest/funnel registration, required
  `categoryId`, a conversion-funnel `status` enum) — "keep visitor records separate from member
  records" read literally. `Meeting` gained `visitorAttendanceQrToken`/`visitorCheckInOpen`, kept
  distinct from both the member-only `attendanceQrToken`/`attendanceRegistrationOpen` pair and the
  unrelated Phase 8 `visitorRegistrationEnabled` field. Migration
  `20260918001558_visitor_management_system`, applied via the same documented non-interactive
  `migrate diff` → `db execute` → `migrate resolve --applied` path Phase 22 established (`prisma
  migrate dev` still doesn't run non-interactively in this environment).
- **No new permissions** — reuses `attendance:manage` (Visitors QR + Visitors Attendance) and
  `payments:view`/`payments:approve` (Visitors Payment) exactly as-is. The same admins already do
  this job for members under the identical rule ("Only Central Admin, Super Admin, or authorised
  Accounts Team may approve"), so minting parallel visitor-specific permissions would have doubled
  the permission matrix for no behavioral difference.
- Public flow: `/visitor-checkin/[token]` (`src/app/(public)/visitor-checkin/[token]/`) — no login,
  unlike member check-in; chapter/meeting come from the QR token, identity comes entirely from the
  form (name + phone required, email/company/business-category/description optional, "how did you
  hear about this meeting" source picker with a conditional inviting-member `<select>` or
  Other-details field, Yes/No payment declaration with amount/date/proof). Proof upload reuses the
  existing `paymentProof` media kind (image or PDF) through the public
  `/api/uploads/public-payment` route, extended to accept an optional `kind` (`image` stays the
  default so `/visit` and `/apply` are unaffected).
- Admin: `/admin/visitors-qr` → `/admin/visitors-qr/[meetingId]` (View/Download/Print/Open-
  registration-link, generated once and reused, same as the member QR page); `/admin/visitors-
  attendance` (meeting-wise: total registered/checked-in/not-checked-in/member-invited/other-source,
  filters, mandatory-reason correction) plus `/admin/visitors-attendance/profiles` (visitor-wise
  history across chapters/meetings, plus a manual "Link to Member" conversion action —
  deliberately never auto-matched, to avoid silently mislinking two different people's histories);
  `/admin/visitors-payment` (its own dashboard, kept separate from both Member Payments and
  Visitors Attendance per the spec, same Approve/Reject-with-reason/Request-Clarification pattern).
  Excel exports at `/api/admin/exports/visitor-attendance` (one workbook, four sheets: attendance,
  invitations-by-member, acquisition-sources, conversions) and `/api/admin/exports/visitor-
  payments`. The Member detail admin page gained a read-only "Visitors Invited" section (unique
  visitors vs. total visits) — no new scoring logic; `PointsConfig`'s existing `VISITOR`
  `ActivityType` (entered manually via Roster) stays the only points mechanism, per the spec's
  "apply performance points only according to existing BWF scoring rules."
- **Real bug caught only by live verification, not by typecheck/lint/build**: the visitor
  check-in action originally handled "already checked in" by attempting
  `visitorAttendance.create()` and catching the unique-constraint violation, then issuing a
  *second* query (`findUniqueOrThrow`) inside the same interactive transaction to fetch the
  existing row. Postgres aborts a transaction the instant any statement inside it violates a
  constraint — catching the error in application code doesn't un-abort it, so that recovery query
  failed with "current transaction is aborted." Fixed by switching to find-then-create (check for
  an existing row first, only create if absent), matching the pattern the member `checkIn()` action
  already used for `Attendance` — the trailing `VisitorPayment` create still uses create-then-catch
  safely, since it's the transaction's last statement with nothing after it to be poisoned.

**Verification performed:** `npm run build`/`lint`/`typecheck` clean; `npm audit` — 0
vulnerabilities (no new dependencies). Ran a real production build (`next build && next start`)
and drove the full flow live with Playwright against the real production database: logged in as
the real Super Admin, generated a Visitors QR for a real scheduled chapter meeting, opened
registration, then — signed out — completed a real public visitor check-in with a declared
payment (a real file uploaded through the browser to R2 via presigned PUT), confirmed a resubmit
with the same phone number for the same meeting is treated as an already-checked-in no-op (not a
duplicate row, not an error — this is what caught the transaction-abort bug above), confirmed the
visit appeared correctly on Visitors Attendance (name/phone/company/category/source/status/
check-in time), performed a mandatory-reason correction, confirmed Visitors Payment showed it
Pending Approval and Approve flipped it to Approved with the reviewer recorded, confirmed
`AuditLog` captured the correction and approval with correct old/new values, and separately
verified an `INVITED_BY_MEMBER` visit renders correctly under that member's own "Visitors Invited"
section. All test data (2 visitor profiles, their attendances/payments, matching audit-log rows)
deleted afterward and the meeting's `visitorCheckInOpen` restored to closed — `visitorAttendanceQrToken`
kept, since it's permanent by design (same "generate once, reuse forever" rule the member QR
follows).

**Known issues / follow-ups:**
- No confirmation email for visitor check-in or payment-status changes — consistent with this
  project's standing precedent (email is Phase 13's job, picked up piecemeal per-feature only if a
  later phase explicitly asks).
- No automated concurrency test (Phase 8's capacity-race discipline) was run against the
  `VisitorAttendance` unique constraint — a true simultaneous double-submit from the same visitor
  is much less likely here than the Phase 8 event-capacity race, but revisit if it ever matters in
  practice.
- Chapter Admin's chapter-scoped access to the three new pages was reasoned from the same
  `requireChapterAccess`/`getChapterScope` pattern already proven for Members/Meetings/Attendance/
  Payments, not independently re-verified with a second real Chapter Admin login this session —
  same category of gap flagged for Phase 22 and earlier phases.

**Correction, 2026-09-18:** all six pages from this phase and its Visitors follow-up — QR Codes,
Attendance, Payments, Visitors QR, Visitors Attendance, Visitors Payment — were originally tagged
`workspace: "website"` in `src/components/admin/sidebar.tsx`'s `NAV_ITEMS` (Phase 20 Batch 4's
two-workspace split). Client asked for them to move to the Member Performance Admin workspace
instead; retagged to `workspace: "performance"` and the `/admin/workspace` picker's description
text updated to match. No permission/route-access change — the workspace split only filters sidebar
visibility for Super/Central Admin, so this is nav placement only.

## Phase 24 — Meeting Invitation Generator

**Status:** Complete (initial design — see note on the reference poster below)

**What shipped:** the client's "Meeting Invitation Generator" spec (2026-09-18) — a new
`/admin/invitations` admin page that turns an existing chapter meeting into a downloadable,
WhatsApp-shareable invitation poster. Brand corrected by the client mid-spec to premium green (not
the brief's original blue) — rendered using the exact same emerald/gold design tokens
(`src/app/globals.css`'s `@theme` block) the rest of `/admin` already renders with, so no new
palette was introduced.

- **Schema:** one new model, `MeetingInvitation` (`meetingId` unique, `onDelete: Cascade` from
  `Meeting`) — the invitation's own editable copy of heading/subheading, chief guest name/
  designation/organisation/photo, "Why Attend" copy, date/time/venue/address/fee labels, a
  Complimentary-Entry flag, and an `includeQr` toggle. Never writes back to `Meeting`/`ChiefGuest` —
  same "customise without modifying the original record" rule Phase 22's Attendance/Payment pair
  already follows. `meetingSnapshotAt` stores `Meeting.updatedAt` at last save/refresh, so the page
  can detect "the underlying meeting changed since this invitation was last saved" and offer a
  refresh rather than silently drifting stale. Migration
  `20260918120000_meeting_invitation_generator`, applied via `prisma migrate deploy` (the
  established non-interactive path in this environment).
- **Two fields have no source to auto-fetch from, confirmed with the user before building:**
  `Meeting` has only a single `startsAt` (no end time), and no meeting-fee field exists anywhere in
  the schema — visitor pricing was never tracked per-meeting. Both `timeLabel`/`feeLabel` are
  manual-only invitation fields (the admin types them fresh each time; `timeLabel` is pre-filled
  with the meeting's own start time as a starting point), never touching `Meeting`. Declined the
  larger alternative (adding `endsAt`/a fee column to `Meeting` itself) to keep this feature additive
  and out of Meeting Management's existing form.
- **No new upload path or shareable link** — chief guest photo replacement reuses the existing
  `MediaUploadField`/presigned-R2-upload flow as-is, and Download is client-side only
  (`canvas.toBlob` → local file), confirmed with the user rather than also uploading the rendered
  PNG to R2 for a persistent link.
- **Permission:** new `invitations:manage`, chapter-scoped the same way as `attendance:manage`
  (`requireChapterAccess`/`getChapterScope`, added to `sidebar.tsx`'s `chapterScopedPermissions`) —
  Central Admin gets it blanket, Chapter Admin only for their own chapter. Nav entry ("Meeting
  Invitations") placed in the Member Performance Admin workspace, alongside the QR Codes/Attendance/
  Payments group this same session just moved there (see the correction note above).
- **Poster rendering — one shared canvas function for both preview and export**
  (`src/lib/invitations/poster.ts`'s `drawInvitationPoster()`), matching the spec's own "use the same
  rendering source... to prevent layout differences." The live preview is the *same*
  `<canvas width={1600} height={2000}>` element the Download button reads from, just constrained to
  a smaller CSS width — not a separate DOM mockup kept in sync by hand. A no-photo chief guest gets a
  clean text-only layout (no broken image, no stock photo); long names/venues/addresses wrap via a
  small `wrapText()` helper; the QR block's vertical position is computed from wherever the meeting
  details finished wrapping, rather than a fixed offset, so a long address can't overlap it.
- **Canvas-tainting fix for the chief guest photo (spec's own explicit ask):** an R2-hosted photo
  drawn directly onto the canvas would taint it on export, since this project doesn't control R2's
  CORS headers. Fixed with a small server action, `imageUrlToDataUrl()`
  (`src/app/admin/(dashboard)/invitations/[meetingId]/actions.ts`), that fetches the image
  server-side and returns a base64 `data:` URL — a data URL never taints a canvas. Restricted to
  URLs under this project's own `STORAGE_PUBLIC_URL`, since the caller is an authenticated admin
  action, not arbitrary user input; this also closes off any accidental SSRF surface. The visitor
  registration QR itself is generated client-side with the already-installed `qrcode` package's
  browser build (`QRCode.toDataURL()`), reusing the exact same `visitorAttendanceQrToken`/
  `getVisitorCheckinUrl()` pair Phase 23's Visitors QR page already established — generated once per
  meeting and reused, never a second independent token.
- **Real UI bug caught only by live testing, not typecheck/lint:** the chief guest `MediaUploadField`
  owns its displayed value internally from `defaultValue` only once on mount. Naively keying it by
  the current photo URL to pick up an external "Refresh from meeting" reset would have remounted it
  (and dropped focus/cursor) on every normal keystroke or upload too, since typing a URL also flows
  through the same `onValueChange` → parent state → prop path. Fixed with a separate
  `photoResetKey` counter bumped only by the explicit Refresh action, not by every value change.

**Verification performed:** `npm run typecheck`/`lint`/`build` clean. Ran a real production build
(`next build && next start`) and drove the full flow live with Playwright against the real
production database, logged in as the real Super Admin: opened `/admin/invitations`, selected
Chapter 01's real "Thursday Meeting" (a real chief guest with no photo and no designation — a good
real-world edge case, not a contrived one), confirmed every auto-populated field matched the live
`Meeting`/`ChiefGuest` records, edited the Why-Attend text and fee, toggled Complimentary Entry
(confirmed the fee input disables), watched the preview update with no refresh, Saved, reloaded the
page and confirmed the saved state restored instead of the defaults (not the meeting's live
defaults), pasted a second real R2-hosted photo URL to exercise the with-photo layout end-to-end
(proves the cross-origin proxy-to-data-URL fix actually works — a tainted canvas would have made
`canvas.toBlob()` throw, not silently produce a bad file), downloaded the PNG and verified via its
own header bytes that it decodes to real 1600×2000 pixels with photo/QR/text all present. Caught and
fixed two real layout bugs from the first render (not from code review): a large dead gap in the
middle of the no-photo layout (the "why attend" card's top was floored at a value only correct when
a photo occupies that space) and a "Scan to Register" caption crowding the poster's bottom frame
border (fixed by moving the QR block's default anchor further from the edge). Test
`MeetingInvitation` row deleted afterward; its two `AuditLog` entries kept, per this project's
standing discipline of never scrubbing the audit trail itself.

**Known issues / follow-ups:**
- No chief guest in the live database has a `photoUrl` set yet — the with-photo layout was verified
  using a real member's own R2-hosted photo pasted into the invitation's independent photo field
  (proving the pipeline works end-to-end), not an actual chief guest photo, since none exists to
  test with today.
- Chapter Admin's chapter-scoped access to this page was reasoned from the same
  `requireChapterAccess`/`getChapterScope` pattern already proven for Attendance/Payments/Visitors
  QR, not independently re-verified with a second real Chapter Admin login this session — same
  category of gap flagged for Phases 22/23.

**Addendum, 2026-09-18 (same day) — poster redesign from the client's reference image:** the client
supplied a reference invitation poster from another networking forum and asked for its alignment
and icon-driven detail communication specifically, explicitly declining its background event photo
("chief guest image will come" instead). Redesigned `drawInvitationPoster()`
(`src/lib/invitations/poster.ts`) to match — brand block top-left, curved gold divider, large
gradient-gold headline, plain description paragraph, a "Connect · Collaborate · Grow" tagline
plaque, and a 4-column icon-badge row (Time/Fee/Venue/Date) with hand-drawn vector icons
(clock/rupee/pin/calendar in gold circular badges) replacing the old stacked plain-text detail
list — every element maps onto the same `InvitationPosterData` fields as before, so no schema,
permission, form, or save/download logic changed; only this one file. Two real bugs surfaced by
rendering actual long-text input (not by lint/typecheck) and were fixed before shipping: the
icon-row banner inherited a stale ivory fill from an earlier, unrelated text draw instead of its own
intended dark tint (a missing explicit `fillStyle` before the fill call), and a genuinely long real
venue address wrapped past a fixed-height banner into the QR code below it — fixed by pre-wrapping
each column's text to measure real line counts, sizing the banner to that content, and capping any
column at 3 lines with an ellipsis. Re-verified live (same production build/server, same real
"Thursday Meeting", plus a deliberately long chief-guest designation and address to stress-test
wrapping) before and after the fix — the first render visibly showed both bugs, the second didn't.
This closes the "reference poster" line in `docs/ARCHITECTURE.md`'s Open Decisions table.

---

## Phase 25 — Brand Logo Rollout

**Status:** Complete

**What shipped:** the client supplied BWF's real logo (a circular green house/smiley mark) with
the instruction to attach it "everywhere applicable — literally everywhere." The source PNG
(1254×1254, transparent) was saved to `public/images/brand/bwf-logo.png`, with `bwf-logo-512.png`
and `bwf-logo-180.png` resized copies for web use. No new palette or layout system — this is
wiring an existing text-only "Builders World Forum" wordmark up with the real mark wherever that
wordmark already appeared, not a redesign.

- **Browser/tab icons:** `src/app/icon.png` (256px) and `src/app/apple-icon.png` (180px) added
  (Next's file-convention favicons); `src/app/favicon.ico` regenerated from the logo (16/32/48/64px
  multi-size .ico via Pillow, since no `.ico` encoder was already in the toolchain).
- **Public site:** logo added next to the wordmark in `Header` and `Footer`
  (`src/components/layout/`), and into the site's Organization JSON-LD (`(public)/layout.tsx`'s
  `logo` field) for SEO/schema purposes.
- **Auth surfaces:** logo added above the "Builders World Forum" label on both login pages
  (`admin/login`, `member/login`), both reset-password pages, and the Super/Central Admin
  "Select Admin Workspace" page — all five shared the same plain-text brand block.
- **Admin/member chrome:** logo added to the admin `Sidebar` (next to "Builders World Forum /
  Admin") and the member portal's top header bar (`member/(portal)/layout.tsx`).
- **Meeting Invitation poster** (`src/lib/invitations/poster.ts`): the top-left brand block (which
  already drew "BUILDERS WORLD FORUM" + chapter label as text per Phase 24) now draws the real
  logo as a circular badge to its left, shifting the text right to make room.
  `InvitationPosterImages` gained a `logo` field; `invitation-editor.tsx` loads it once from the
  static asset path via the existing `loadImage()` helper (same-origin, so no canvas-tainting
  proxy needed the way the chief guest's remote photo requires).
- **Roster Sheet PDF** (`src/lib/roster/generate.ts`): `drawLogoBadge()` (previously a text-only
  "BUILDERS WORLD FORUM" wordmark used on the cover page and every member-table page header) now
  draws the logo image first via `doc.image()`, reusing the existing `fetchImageBuffer()` helper
  against the same static path; the buffer is fetched once in `generateRosterPdf()` and threaded
  through `renderCover()`/`renderMemberTable()` rather than re-read per page.

**Verification performed:**
- `npx tsc --noEmit` and `eslint` on every touched file — clean.
- Ran the app locally (`next dev`) and screenshotted the public homepage (header + footer),
  `/admin/login`, and `/admin/workspace` via Playwright — logo renders correctly on both light and
  dark brand blocks.
- Logged in as the real Super Admin, walked the real Meeting Invitation Generator flow for
  Chapter 01's live meeting, and screenshotted the generated canvas — the logo badge renders
  crisply in the poster's top bar. Read-only; no Save/Download was clicked, so no data changed.
- Ran `generateRosterPdf()` standalone against synthetic roster data (not the real DB) and
  rendered the resulting PDF's first page to an image — logo renders correctly beside the cover
  page's wordmark.
