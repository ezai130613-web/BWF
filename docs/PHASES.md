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
- No admin UI to add a *new* leadership role type (e.g. "Treasurer") — the four seeded roles
  cover the brief's named examples; adding another currently means a seed-script edit.
- Object storage still isn't wired up (Neon isn't either) — Company/Member logo/photo fields
  exist in the schema but there's no upload UI yet; both are still open decisions.
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
- No photo/brochure/video upload UI — URL fields only, pending Neon/R2 credentials.
- Programmatic SEO landing pages (brief §52) deliberately deferred — see
  `docs/ARCHITECTURE.md`.
- Directory search has no pagination — fine at current scale, will need it once member counts
  grow.
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
- `convertApplicationToMember`'s error path (slot already taken) surfaces via the admin route's
  generic error boundary rather than a friendly inline message — functionally correct, just
  less polished than the rest of the admin's form handling. Noted in `docs/ARCHITECTURE.md`.
- Company matching on conversion is exact-name-only, no fuzzy dedup — fine for now, revisit if
  duplicate companies from spelling variants become a real problem.
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
- Event capacity enforcement (`registerVisitor`'s count-then-create check) has the same
  theoretical race condition as any check-then-act without a transaction — two simultaneous
  submissions right at the last slot could both succeed. Not worth a DB-level constraint at
  this traffic scale; revisit if it ever actually happens.
- `ForbiddenError` on a direct out-of-scope URL still surfaces as Next.js's generic 500 error
  page rather than a friendly "you don't have access" screen — same known gap already recorded
  for Phase 7's conversion error path; a proper error boundary for admin routes is a good
  candidate for a later polish pass, not specific to this phase.
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
  the override in `package.json` can be removed.
- The PDF export's table layout is hand-drawn (no table-layout library) — correct and paginating
  for the data volumes tested, but only lightly exercised; worth a visual re-check once real
  member counts are much larger.
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
  `whatsapp_click` and `event_registration` share code paths with events that were verified
  (`member_contact_click`'s `TrackedAnchor`, `visitor_registration`'s success-effect) but weren't
  independently fired in this pass — `whatsapp_click` because `NEXT_PUBLIC_WHATSAPP_NUMBER` isn't
  set in this environment (the CTA doesn't render at all), `event_registration` because no
  currently-open event registration was available to click through in this session's test data.

**Known issues / follow-ups:**
- `whatsapp_click` and `event_registration` are wired but not independently fired-and-observed
  this phase (see above) — low risk given the shared-code-path reasoning, but worth a real check
  once `NEXT_PUBLIC_WHATSAPP_NUMBER` is set and an open event exists.
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
- Admin Analytics (brief §51, explicitly "Later") and Legacy SEO/redirects (brief §54, explicitly
  Phase 15) were not built — both are the brief's own future work, not gaps in this phase.

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
- The weekly report cron always sends the default four-column export (no chapter/company columns)
  — there's no per-recipient "include extra columns" preference in `WeeklyReportRecipient` today,
  matching the on-demand export's own default. Revisit if a recipient specifically wants the richer
  columns automated too.
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
- **Nothing in this phase was verified against real production infrastructure** — no live Vercel
  deployment, no real Neon database, no real object storage, no real Resend API key exist in this
  environment. Everything above was verified as thoroughly as a local environment allows (a real
  production build + production server, not dev mode) but the actual backup/recovery runbook and
  the deployment runbook are both necessarily unverified prose until a real deployment happens —
  flagged honestly rather than presented as tested.
- Lighthouse was run against exactly 3 representative pages, not the whole site — a full sweep
  might surface more of the same class of issue the `/members` run caught. Worth repeating once
  real photography replaces every `MediaPlaceholder` (the current placeholders are cheap to
  render; real images will change the performance profile).
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
