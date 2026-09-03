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
