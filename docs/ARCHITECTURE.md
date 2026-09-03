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

**Local dev database operational note (Phase 3 incident)**: `npx prisma dev`'s shadow-database
handling turned out to be unreliable in this environment — `migrate dev` repeatedly failed with
"type already exists" against the shadow DB even after restarting the instance and manually
resetting the shadow schema, and even a fresh `prisma dev --name <new>` instance shared
underlying data with the old one (each new named instance was NOT actually isolated — port
changes, same data). Since `migrate reset` is destructive and this harness blocks destructive
commands even with in-conversation user consent (a separate, stricter gate than Prisma's own
consent mechanism), the fix was the officially-supported non-destructive path: baseline the
existing schema as already-applied (`prisma migrate resolve --applied <migration>`), generate
the new migration's SQL via `prisma migrate diff --from-config-datasource --to-schema
./prisma/schema.prisma --script` (bypasses the shadow DB entirely), apply it with `prisma db
execute --file <sql>`, then `migrate resolve --applied` again to record it. Both migrations
ended up properly tracked in `prisma/migrations/` with no data loss. If `migrate dev` ever
throws a shadow-database P3006/P3018 error again in this environment, reach for this sequence
before anything destructive.

**Update (Phase 10 incident)**: a second, different failure mode from the same root cause
(`prisma dev`'s local daemon being generally fragile in this environment) — after a long,
heavy session (this one spans Phases 0–10), the daemon silently degraded and every query started
intermittently throwing `DriverAdapterError: ConnectionClosed`, initially indistinguishable from
a real concurrency bug in application code. `npx prisma dev ls` is the fast way to check for this
— it showed the instance in an `error` state. Fix: `npx prisma dev start <name>` (the same named
instance — data persists, confirmed by re-seeding afterward and finding all prior test data
intact). Worth checking this before spending time debugging a "phantom" connection error as if
it were a code problem.

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

### Authentication (Phase 2)
**Auth.js (NextAuth) v5** — pinned to the exact beta it was built against
(`5.0.0-beta.32`, see `package.json`; do not `npm update` this without deliberately
re-testing the auth flow). v5 is the only version with real App Router support; v4 targets
Pages Router and is a poor fit for this codebase. It has stayed on a beta tag for a long time,
which is a real, acknowledged tradeoff, not an oversight — the alternative (hand-rolling
session cookies/CSRF/OTP orchestration from scratch) is worse for a security-critical login
system than depending on a widely-deployed beta. `@auth/prisma-adapter` was evaluated and
deliberately **not used** — it's built for OAuth account linking and database sessions, neither
of which apply here (Credentials-only, JWT sessions); using it anyway would have added
complexity without benefit.

**Flow**: two-step (password, then OTP), not NextAuth's Credentials provider doing both at
once — `POST /api/admin/auth/request-otp` verifies email+password, rate-limits/locks the
account after 5 failures (`User.failedLoginCount`/`lockedUntil`), and creates an `OtpChallenge`
row (hashed code, 10-minute expiry, 5 attempts) if the account is ACTIVE and holds an admin
role. The code is emailed via `sendEmail()` (`src/lib/email.ts`). The NextAuth `Credentials`
provider (`id: "admin-otp"`) then only ever receives `{ challengeId, code }` — it never sees a
password. All login-flow error messages are deliberately generic ("Invalid email or password")
to avoid leaking account existence.

**Sessions are JWT** (a Credentials-provider requirement, not a preference), but with real
server-side revocation despite that: `User.sessionVersion` is bumped on suspend, and the `jwt`
callback re-checks it (plus account status) against the database on every request after the
initial sign-in, marking the token `revoked` if they've drifted. This is what makes "sign this
admin out everywhere" (brief §56) actually work under a stateless-JWT strategy. Session
`maxAge` is 8 hours; `requireRecentAuth()` (`src/lib/auth/rbac.ts`) additionally demands a
sign-in within the last 15 minutes before high-risk actions (suspending a user, changing role
permissions) — brief §56's "recent-authentication requirement for high-risk actions."

**Password hashing**: Argon2id via `@node-rs/argon2` (OWASP's current recommendation over
bcrypt), OWASP baseline parameters. OTP codes use a fast SHA-256 hash instead — deliberately
different tradeoff, since OTP security comes from short expiry + attempt-limiting, not hash
cost, and there's no reason to pay Argon2's CPU cost on every 6-digit code check.

**RBAC**: `Role`/`Permission`/`RolePermission`/`UserRole` tables (not a hardcoded enum) so
Central Admin's permission set is actually editable by Super Admin at runtime (brief §9
"Control user permissions"), via `/admin/roles`. Super Admin's own permission row is
intentionally **not** editable through that UI — it's the one role that must never be able to
lock itself out. `requirePermission()`/`requireRole()` (`src/lib/auth/rbac.ts`) do the actual
enforcement and are called inside every protected page/Server Action, not just relied on via
route protection — see the Route protection note below for why that matters.

**Route protection**: `src/proxy.ts` — **not** `middleware.ts`. Next.js 16 renamed the
middleware file convention to `proxy.ts` (same behavior; `middleware.ts` is deprecated but
still works with a console warning). This one genuinely surprised a training-data-based
assumption, which is exactly why `.agents/skills/` and the bundled `node_modules/next/dist/docs`
are worth checking before writing Next.js 16 routing code rather than trusting memory. A second
consequence of the rename matters here too: Proxy now **defaults to the Node.js runtime**
(it was Edge-only before Next 15.2), which is what makes it safe for `src/proxy.ts` to wrap
NextAuth's `auth()` and do a real Postgres lookup in the `jwt` callback on every request —
that would not have been possible under the old Edge-only middleware. Next's own docs
explicitly warn that a proxy matcher change can silently stop protecting a route, so
`requireAdminSession()`/`requirePermission()` inside each page/action are the real
authorization boundary; `proxy.ts` is a fast-path UX redirect on top of that, not the only
guard.

**Known gap, honestly**: `/api/admin/auth/request-otp` isn't behind NextAuth's own CSRF
mechanism (that only covers NextAuth's own endpoints) and doesn't have IP-based rate limiting
beyond the per-account lockout — acceptable for now given its blast radius (worst case, an
attacker triggers OTP emails to an account they don't control; they still can't complete
login), but a real IP/device rate limiter (Upstash Redis or similar) is worth adding before
this handles real member-facing traffic at scale, not just a handful of admins.

### Business data & RBAC scoping (Phase 3)
**Category exclusivity (brief §15, CRITICAL)** is enforced by `Member.activeSlotKey`, a
computed column set to `"{chapterId}:{categoryId}"` only while `status == ACTIVE` (null
otherwise) with a database `@unique` constraint on it — see the field's comment in
`schema.prisma` and `src/lib/members/slot.ts`. SQL unique constraints treat every NULL as
distinct, so inactive/suspended members never collide with each other, but two ACTIVE members
in the same chapter+category are a real constraint violation, not just a form check —
verified by actually trying it (see `docs/PHASES.md`). Every write to `Member.status` or its
chapter/category must go through `computeActiveSlotKey()`, not set the field directly.

**Chapter Admin scoping (brief §11)**: `UserRole.chapterId` (nullable, only meaningful for the
CHAPTER_ADMIN role) plus `requireChapterAccess()`/`getChapterScope()` in
`src/lib/auth/rbac.ts`. Chapter Admin intentionally holds zero rows in `RolePermission` —
unlike Super/Central Admin, their access isn't a blanket grant, so it's checked separately from
the permission system. Currently wired into the Members admin page (list is chapter-filtered,
creation is chapter-checked); Chapters/Companies/Categories admin pages are still
Super/Central-Admin-only (brief doesn't give Chapter Admin control over those). Extend the same
`requireChapterAccess()` pattern if a chapter-scoped view of Events/Visitors is needed once
those phases land.

**Company ≠ Member (brief §14)** is a straightforward FK relationship — `Member.companyId`,
many members per company, `onDelete: Restrict` so a company with members can't be deleted
out from under them (soft-deactivate instead, per §43).

**Configurable leadership roles (brief §22)**: `ChapterLeadershipRole` is a real table (key +
label), not a hardcoded enum, seeded with President/Vice President/Secretary/Coordinator.
Assigning members to roles is fully self-service via `/admin/chapters/[id]`; adding a *new
role type* currently requires a seed-script edit, not an admin UI — reasonable gap for now
since new role types should be rare, but worth a small admin form later if that assumption
turns out wrong.

### Member profiles & directory (Phase 4)
**`MemberProfile` still isn't split out** — the Phase 3 decision holds. The brief's §19 profile
fields (services, USP, years in business, certifications, etc.) were added directly onto
`Member`. They're per-*member*, not per-*company* — deliberate, since brief §14's own example
(one company, two reps, two chapters/categories) means two members at the same company can
have genuinely different specialisations worth describing separately.

**Public profile URLs** are `/members/{slug}`, where `slug` is generated once at creation
(`generateUniqueMemberSlug()` in `members/actions.ts`) and never changes afterward, even if the
member's name is later edited — so a published/shared link never breaks. Collisions get a
numeric suffix.

**Media fields (photo/brochure/video) are URL-only** — plain text columns, no upload UI, since
object storage (Neon's sibling open item, R2) still isn't wired up. Same pattern as Company's
`logoUrl` from Phase 3. `videoUrl`'s constraint to "direct file or Google Drive only" (brief
§47) is documented in the field comment and the admin form's label, not enforced by validation
— treated as a content-moderation judgment call for whoever fills it in, not something worth a
regex fighting real Drive URL variations.

**Search** (`/members`) is plain Postgres `ILIKE` (`contains`, `mode: "insensitive"`) across
name/company/services/specialisations — no search index (Postgres full-text or external) yet.
Fine at this scale; revisit if the member count grows enough that this gets slow, no earlier.
Results are grouped chapter-wise per brief §18, with no ranking beyond that grouping (brief
explicitly asks to avoid rankings that favor members).

**Deferred, not forgotten**: brief §52's programmatic SEO landing pages
(`/architects-in-chennai` style) were considered for this phase since they're directory-
adjacent, but pushed out — they're really an SEO/content concern more than a directory concern,
and don't have a clean home in the phase table. Revisit alongside Phase 5 (blog SEO/AEO/GEO) or
Phase 10 (technical SEO), whichever ends up the more natural fit once that work starts.

### Blog / content system (Phase 5)
**`Author` is a distinct model from `Member`**, not a reuse of it — brief §32 lists BWF Team,
guest contributors, and agency team as valid authors alongside members, so authorship needed
its own identity. `Author.memberId` is an optional 1:1 link for when an author *is* a member
(unique constraint — one author profile per member, checked explicitly in
`authors/actions.ts` since Prisma's own error on that constraint isn't a friendly message).

**Content is trusted Markdown**, rendered server-side via `marked` (`src/lib/blog/render.ts`)
straight to `dangerouslySetInnerHTML`, deliberately without an HTML sanitizer on top. That's
safe specifically because content is admin-authored-or-approved — see the schema comment on
`Blog.content` and the render helper's own comment. If Phase 11's member self-submission path
ever lets a post reach PUBLISHED without an admin review step in between, **this trust
boundary breaks and sanitization (e.g. `dompurify`) must be added before that ships** — flagging
this explicitly so it isn't missed.

**Scheduling needs no cron job.** A `SCHEDULED` post becomes publicly visible once
`scheduledAt` has passed, evaluated lazily at read time by `publiclyVisibleBlogWhere`
(`src/lib/blog/query.ts`) rather than needing a background job to flip status to `PUBLISHED` at
the right moment. The admin's own post list still shows the real stored status (`SCHEDULED`,
not `PUBLISHED`) — only public-facing queries use the lazy-visibility filter. No infrastructure
for actual background jobs exists yet in this project; this sidesteps needing any for this
specific feature.

**Structured data (Article + FAQPage JSON-LD) shipped in this phase**, not deferred to
Phase 10 — brief §29 (literally the "SEO/AEO/GEO" section of the *blog* phase) calls out
"structured data" as part of the blog's own content architecture, distinct from brief §53's
more general, phase-unassigned schema list (Organization/Person/LocalBusiness/etc., which
covers things like member profiles and stays Phase 10's job per the Phase 4 note above).

**Tags use an implicit Prisma many-to-many** (`tags BlogTag[]` on both `Blog` and `BlogTag`,
no explicit join model) — the only place in the schema doing this, everywhere else uses an
explicit join table for consistency with the audit/metadata needs those joins have (chapter
leadership, role permissions). Tags don't need that — they're just labels — so the simpler
implicit approach was the right call here specifically.

**FAQ storage**: `Blog.faq` is a `Json` column, `[{ question, answer }, ...]`, validated with
zod only at the point of writing (`updateBlog` in `blogs/actions.ts`) — there's no schema-level
guarantee of that shape, same tradeoff `AuditLog.metadata` already made in Phase 2.

### Testimonials, feedback & website content CMS (Phase 6)
**Three different visibility models, one phase** — worth keeping straight since they look
similar (all "small admin-managed records") but behave very differently:
- **Testimonial**: public once `status: APPROVED`. Public submissions always land `PENDING`
  (brief §33); admin-authored ones publish immediately (`createTestimonialDirect`) since brief
  §33 explicitly allows that for admin-created content. Both paths require an explicit,
  never-pre-checked consent checkbox (brief §58) — the admin form has one too, not just the
  public one, so an admin can't silently bypass consent by typing on someone's behalf.
- **Feedback**: never public, full stop. `/admin/feedback` requires `feedback:view`, which the
  seed grants **only** to `SUPER_ADMIN` — deliberately left out of `CENTRAL_ADMIN`'s permission
  list even though Central Admin gets nearly everything else, because brief §34 is explicit
  that feedback visibility doesn't follow the usual pattern. Verified by actually logging in as
  a Central Admin and confirming they're blocked, not just by reading the seed file.
- **WebsiteContent / SiteFaq**: always public, only admin-*editable*. `content:manage` follows
  the normal Super+Central pattern.

**Public submission actions live under `src/app/(public)/.../actions.ts`, not
`src/app/admin/.../actions.ts`** — `submitTestimonial` and `submitFeedback` originally got
written into the admin route's `actions.ts` files (convenient since that's where the related
admin actions already were) and then moved once the mismatch was obvious: a public, no-auth
endpoint has no business living in the same module as permission-gated admin mutations, even
though Next.js doesn't technically care where a Server Action file lives. Worth remembering as
a pattern for any future public-submission feature.

**Content blocks seeded as structure only** (`prisma/seed.ts`'s `WEBSITE_CONTENT` array) — keys
and labels exist so admin knows what's editable, but values are `null` except
`footer.tagline`, which carries forward the Phase 1 hardcoded string so nothing visually
changes on first deploy. No fabricated "About BWF" copy or contact details were invented to
fill the gaps — every page reading a content block has a sensible fallback for when the value
is still empty (see `getContent()` in `src/lib/content.ts`).

**Scope boundary, deliberate**: only `footer.tagline`, `contact.phone/email/address`, and
`about.intro` are wired up as real content blocks — not the homepage hero, section headlines,
or other typography-sensitive copy. Brief §62 itself warns against making "every pixel
editable" to protect design consistency; hero/section copy stays code-controlled for that
reason. Adding another block later is a one-line seed addition plus one `getContent()` call at
the point of use — the mechanism doesn't need to change.

### Membership application & waiting list (Phase 7)
**The availability check is the source of truth for the apply flow, and it's the same check
the exclusivity constraint itself is built on** — `getChapterAvailability()`
(`src/lib/applications/availability.ts`) queries `Member.activeSlotKey` pairs directly, so the
public wizard can never show "Available" for a slot the database would actually reject. The
whole per-category availability matrix (every category × every chapter) is computed once,
server-side, in `/apply`'s page component and handed to a client wizard as plain data — the
multi-step UI (category → availability → chapter-or-waitlist → form) runs entirely client-side
off that one payload, no extra round-trips as the applicant moves through steps.

**Applications don't reserve a slot** — only a converted Member does. Nothing stops two
applications from both targeting the same open chapter+category before either is converted;
the exclusivity constraint is enforced at conversion time (`convertApplicationToMember`,
brief §17 step 7), and the *second* attempt correctly fails with the same
`SLOT_TAKEN_ERROR` message the direct member-creation form uses. This was actually caught and
verified during testing, not just reasoned about — see `docs/PHASES.md`.

**Waiting list has no chapter, on purpose.** A `WAITLISTED` application's `chapterId` is `null`
until an admin explicitly assigns one (brief §16) — the assignment dropdown
(`ReassignChapterForm`) lists every chapter including `DRAFT` (internal-only, not yet public)
ones, since brief §16 explicitly allows waitlisted applicants to be routed into a chapter that
doesn't publicly exist yet.

**The applicant's Company doesn't exist as a real record until conversion.** `companyName` is
plain text on `MembershipApplication`; `convertApplicationToMember` matches an existing Company
by exact name or creates a new one. No dedup/fuzzy-matching beyond exact name match — a
deliberate simplicity tradeoff, not an oversight; revisit if duplicate companies from slightly
different name spellings turn out to be a real problem in practice.

**Known UX gap**: `convertApplicationToMember` is a plain form action (no `useActionState`), so
when it throws — the slot-taken case above, mainly — the error surfaces via the admin route's
generic error boundary (`Something went wrong.` + the real message) rather than a friendly
inline message on the button itself. Functionally correct and the message is still readable,
just not as polished as the rest of the admin's form error handling. Worth a small refactor
later if this comes up often in practice.

**No email notifications yet** — brief §49 lists application-related emails, but that's
Phase 13's job (Email/Notification Automation) as its own phase; sending anything here now
would be a partial, inconsistent implementation. The application record captures everything
needed for Phase 13 to wire real emails on top of without a schema change.

### Visitor registration, meetings & events (Phase 8)
**One `Visitor` row per registration**, not a separate `Visitor` + `VisitorRegistration` pair
even though the brief's §13 model list names them separately. Every field brief §23 actually
asks a visitor to submit — name/phone/email/company/category/chapter/meeting-or-event/
referring-member — belongs to *that specific registration*, not to a reusable "person" entity.
Splitting them only earns its cost once the same person visits more than once and that history
needs reconciling across visits, which isn't a requirement yet — same simplicity call as
Member/MemberProfile in Phase 3. Revisit if repeat-visitor deduplication becomes real.

**`Event.chapterId` is nullable on purpose** (brief §26: "Chapter or Global"), and that ripples
into access control: `requireChapterAccess()` (used everywhere else — Members, Meetings,
Visitors) needs a real chapter to scope against, so it can't gate a global event. Events
introduced `requireEventAccess()` (`src/app/admin/(dashboard)/events/actions.ts`) as a thin
wrapper: chapter-scoped events go through the usual `requireChapterAccess()`, global events
fall back to a plain `requirePermission("events:manage")` check. A Chapter Admin holds no
blanket permission at all (by design, see Phase 3's RBAC note below), so this fallback
naturally excludes them from ever touching a global event — no extra logic needed to enforce
that, it falls out of how the permission table is already seeded.

**Meetings are always chapter-scoped** (`Meeting.chapterId` is `NOT NULL`) — unlike Events,
there's no "global meeting" concept in the brief, so `meetings:manage` access is plain
`requireChapterAccess()` throughout, identical to `members:manage`.

**Visitor registration re-validates on submit, never trusts the page's last render.** The
shared `registerVisitor` action (`src/app/(public)/visit/actions.ts`) re-checks the
meeting/event's live status, registration-enabled flag, deadline, and capacity server-side
before creating the row — the same discipline `submitApplication` uses for chapter availability
in Phase 7, for the same reason: the page could be stale by the time someone submits.

**Visitors are explicitly not required to hold an open category** (brief §23) — so unlike
`Member`, there's no `activeSlotKey` / exclusivity check on `Visitor`. A visitor can register
interest in a category+chapter that's already fully occupied; that's fine, it's just interest,
not a slot claim. Turning visitor interest into an actual application is still a manual step
(the visitor, or an admin on their behalf, submits through `/apply` normally) — visitor
registration was deliberately kept from auto-creating a `MembershipApplication`, since the
brief treats them as genuinely separate stages of the funnel (§17 vs §23-25).

### Reporting, exports & weekly reports (Phase 9)
**One export engine, two callers.** `src/lib/reports/member-export.ts` is the single source of
truth for the Weekly Member Export's row set and rendering (brief §44) — `buildMemberExportRows()`
queries Member joined to Category (and optionally Chapter/Company), and `toCsv()`/`toXlsxBuffer()`/
`toPdfBuffer()` render the same rows three ways. `/api/admin/exports/members` (the on-demand
download) is the only caller today; once Phase 13 wires an actual sender, the weekly-report path
calls the exact same functions rather than duplicating the query or the column list, so the two
can never drift apart on what "the export" contains.

**Excel via `exceljs`, PDF via `pdfkit`** — both pure-JS, no native bindings, chosen the same way
prior phases picked a dependency (Playwright, `marked`): smallest thing that does the job, not the
most feature-complete option. The PDF path hand-draws a simple paginating table rather than using a
table-layout plugin — the export is a fixed 4-6 column report, not general document layout, so a
plugin dependency wasn't worth it. `exceljs` pulled in a vulnerable transitive `uuid@8` (moderate
severity, unrelated to anything this app does with it — internal use only, for conditional-
formatting rule IDs); overridden to `uuid@^11.1.1` in `package.json`, same pattern as Phase 0's
`mysql2`/`deepmerge-ts` overrides for a Prisma-tooling transitive dependency.

**Export permission is scoped like Members/Meetings/Events/Visitors, not like Reports.**
`exports:manage` follows the established `requireChapterAccess()`/`getChapterScope()` pattern —
Chapter Admin gets it via chapter scoping (brief §45: "Chapter Admin can export ONLY their
chapter"), no blanket `RolePermission` row. `reports:manage` (the weekly-report recipient/schedule
config on `/admin/reports`) is a **separate**, blanket-only permission — brief §45 only ever
describes Chapter Admin's role as *exporting*, never as configuring who else receives the
automated report, so giving both nav items the same permission key would have made "Reports" show
up for Chapter Admin too via the sidebar's chapter-scoped-permission list. Two keys, one for each
brief-described capability, kept that distinction real instead of papering over it in the UI layer.

**The export route re-derives scope from the session, not the query string.** `chapterId` in
`/api/admin/exports/members`'s query params is honored only when the caller holds the blanket
`exports:manage` permission (i.e., Central/Super Admin picking which chapter, or "all" for a
master export); a Chapter Admin's `chapterId` filter is always their own from `getChapterScope()`,
regardless of what the URL says — verified by actually hand-crafting a spoofed request during
Phase 9 testing (see `docs/PHASES.md`), the same "never trust the last render" discipline
`registerVisitor` (Phase 8) and `submitApplication` (Phase 7) already established for public
mutations, now applied to an authenticated read.

**Weekly report automation is deliberately not built yet.** Brief §46 itself says the system
"should eventually automatically generate and email" the report — Phase 9 builds the configurable
recipients and schedule (`WeeklyReportRecipient`/`WeeklyReportSettings`, both real, admin-editable,
"do not hardcode recipients" satisfied literally) but does not send anything automatically.
This mirrors Phase 7 and Phase 8, both of which built complete workflows around data that
brief-obviously wants an email sent about (application confirmations, visitor confirmations) and
still deferred the actual sending to Phase 13 ("Email/Notification Automation") rather than
half-build email infra piecemeal across every phase that produces something worth emailing.
`WeeklyReportSettings.isEnabled` exists and is admin-toggleable now, but has no effect until
Phase 13 wires a real sender on top of it — flagging this explicitly, the same way Phase 5 flagged
its Markdown-sanitization gap, so it isn't mistaken for working automation later.

**Dashboard metrics scope down for Chapter Admin, not just filter down.** `getDashboardMetrics()`
(`src/lib/dashboard/metrics.ts`) returns a materially different, smaller shape for a chapter scope
rather than the same fields pre-filtered — Total companies, Membership applications, Blog activity,
and Recent admin activity are all omitted for Chapter Admin, not shown-as-zero, because Chapter
Admin holds no `companies:manage`/`applications:manage`/`audit_log:view` permission anywhere else
in this admin. Showing a dashboard count for a domain a Chapter Admin can never open the detail
view for would be a new inconsistency this phase introduced, not a helpful summary — brief §11's
"Chapter Admin can only access their assigned chapter" is read here as applying to what they can
*see*, not just what they can edit.

**"New leads" is the one brief §39 base-list metric this phase omits.** The Leads system (brief
§35) has no phase of its own in the brief's own Phase Structure table (§70) — it isn't Phase 9's
"Reporting + Exports + Weekly Reports," and nothing else claims it either (chatbot lead capture in
Phase 12 covers one lead *source*, not the general Leads model brief §35 describes). Building a
Leads model now, just to populate one dashboard tile, would be exactly the kind of early
future-phase feature brief §72 warns against. Following the Phase 1 precedent (an honest "coming
soon" over a fabricated number), the tile is simply absent rather than showing a fake zero.
Whichever future phase does add Leads should also give this dashboard tile a home — noted in both
here and the Phase 9 follow-ups so it isn't lost.

### Analytics, SEO & structured data (Phase 10)
**GA4/GSC/Organization schema live in `(public)/layout.tsx`, not the root layout.** Brief §50's
entire analytics/schema section is written about the public marketing site — there's no reason
for internal admin or member-portal usage to carry public tracking scripts or business schema, so
these are scoped to the public route group specifically rather than site-wide, the same way the
public/admin/member surfaces already don't share a design system (brief §14).

**`trackEvent()` is a thin, always-safe wrapper, not a real analytics SDK** — it no-ops if GA4
hasn't loaded (or isn't configured at all), so every call site can fire an event unconditionally
without a "is GA4 ready" check first. Two small client components, `TrackedAnchor` and
`TrackedButton`, exist purely because of the Server/Client Component boundary: a Server Component
(most marketing sections — `Hero`, `MembershipCta`, the chapter detail page) can't pass a function
prop to a Client Component, so wherever a tracked click needed to live inside otherwise-server-
rendered markup, the `onClick` had to be defined inside a small Client Component of its own rather
than passed down. `Header` already being a Client Component (for its mobile-menu state) is the one
place a plain inline `onClick` was possible instead.

**One `member_directory_search` event, not brief §50's two ("Category searches"/"Member
searches").** The member directory is a single form that can carry a keyword, a chapter, and a
category in one submit — firing two separate events off one submission for a brief that names two
search *kinds*, not two simultaneous actions, would just double-count every search that used more
than one field. One event with both as params gives an analyst the same information (was this a
keyword search? a category filter? both?) without the double-count.

**"Profile enquiries" and "Member contact clicks" are treated as the same event
(`member_contact_click`)** — the brief lists them as two bullets but never defines "enquiry" as
anything more concrete than "someone tried to reach this member," and the only such touchpoint
that exists on a member profile today is the phone/WhatsApp/email/website/maps contact block.
Revisit if a real enquiry *form* (distinct from a contact link) is ever added — brief §35's Leads
system, once it has a phase, might be exactly that.

**"Blog performance" and "Member page views" need no custom event** — GA4's own automatic
pageview tracking already covers per-URL views once the base `gtag.js` script is loaded
site-wide; brief §50 lists them alongside genuine custom events, but nothing about either implies
they need bespoke instrumentation beyond that.

**Programmatic SEO pages are computed live from the database, chapter-agnostic by location** —
`listProgrammaticLandingPages()` (`src/lib/seo/programmatic.ts`) crosses every active `Category`
with every distinct `location` string among active `Chapter`s (currently just "Chennai" across
all three seeded chapters), not a per-chapter list — brief §52's own examples name a city, and a
city can have several chapters, so a landing page for "architects-in-chennai" correctly pulls
architects from every Chennai chapter, not just one. This recomputes from live data on every
request (no cache, no static list) specifically so a newly-added category or a chapter in a new
city becomes a real, crawlable page with zero code change — matching brief §52's own "location/
category combinations may be added later." Pluralization for the URL slug
(`src/lib/seo/pluralize.ts`) is a small hand-rolled three-rule heuristic rather than a library
dependency — categories are admin-editable free text (brief §68), so a static lookup table
wasn't an option, and the three rules (consonant+y→ies; s/x/z/ch/sh→es; else +s) correctly handle
every category in the current seed list.

**The landing page route deliberately has no `generateStaticParams`** — every other slug-based
detail route in this app (`/members/[slug]`, `/chapters/[slug]`, `/insights/[slug]`,
`/events/[slug]`, `/authors/[slug]`) renders on demand with no pre-built static params, and this
one now matches that convention rather than being the sole exception. It also happened to be the
direct fix for a real `next build` failure this phase — see the Phase 10 entry in
`docs/PHASES.md` for the full incident: pre-building every category×location combination added
just enough concurrent build-time database load to tip the already-documented-flaky local
`prisma dev` proxy (see the Local dev database operational note above) into consistently failing.

**`Prisma Client`'s connection pool is now explicitly capped (`max: 5` in `src/lib/db.ts`).**
Found while root-causing the same build failure above, but kept as a real fix rather than a
local-only workaround: several concurrent serverless function instances (the actual Vercel+Neon
deploy target) each opening a large, uncapped connection pool is a well-known way to exhaust a
managed Postgres database's real connection limit in production, not just a local `prisma dev`
quirk.

**`NEXT_PUBLIC_SITE_URL` is the one new required-before-launch env var this phase adds** — used
for `metadataBase`, the sitemap, and every absolute URL inside JSON-LD. Defaults to
`http://localhost:3000` so nothing breaks in dev; the real public domain is still the same open
decision tracked in the table below (needed by Phase 14–15), not a new one.

### Member login & profile edit approval (Phase 11)
**Members reuse the admin auth stack — same User/Role/OtpChallenge tables, same two-step
password-then-OTP flow — rather than a separate mechanism.** `Role.MEMBER` was seeded back in
Phase 2 specifically anticipating this. The only real difference between the two login surfaces
is which role key is accepted (`ADMIN_ROLE_KEYS` vs `MEMBER_ROLE_KEYS`, both in
`src/lib/auth/constants.ts`) and where a successful login lands — everything else (lockout,
generic error messages, OTP verification, the login form's state machine) is one shared
implementation (`src/lib/auth/otp-login.ts`, `OtpLoginForm`), not two copies. This was a
deliberate DRY call, not the project's usual "three similar lines is fine" default — duplicating
~60 lines of lockout/verification logic across two login surfaces would have meant a future
security fix applied to one copy and silently not the other.

**This surfaced a real, previously-latent gap: `requireAdminSession()` never actually checked for
an admin role, only that some session existed.** Harmless through Phase 10 because the only
sessions that could ever exist were admin ones; became a real bug the moment Member logins shared
the same mechanism (a signed-in Member could load `/admin`'s bare dashboard, though nothing
`requirePermission()`-gated). Fixed alongside the equivalent `requireMemberSession()`, both now
checking their own role list explicitly. Worth remembering for any future third login surface:
"a session exists" and "the right kind of session exists" are different checks, and the
proxy-level fast path (`proxy.ts`) needs the same role-awareness as the page-level guard — an
initial fix to only `requireAdminSession()` produced an infinite redirect loop (see
`docs/PHASES.md`'s Phase 11 entry) until `proxy.ts` was made role-aware too, for exactly the
reason Next's own docs already warn about (a proxy matcher/rule change can silently stop
protecting a route the way you'd expect).

**Portal login access is admin-granted, never self-service signup.** A Member row already exists
(admin created it, possibly via Phase 7's conversion flow) before anyone can log in as them —
`grantMemberPortalAccess` creates the `User`+`UserRole` and links `Member.userId` in one step, an
admin action, not a public registration form. There is deliberately no field to change a member's
own login email from inside the portal — `User.email` (login) and `Member.email` (public contact,
editable via a profile revision like everything else) are separate columns that happen to often
start out matching, not the same field wearing two hats.

**Revoking portal access reuses the exact suspend/reactivate mechanism admin users already had**
(`User.status` + `sessionVersion` bump) rather than a Member-specific concept — "access revoked"
and "account suspended" are the same state for a login, whether that login belongs to an admin or
a member. `Member.userId` is left pointing at the (now-suspended) `User` row rather than nulled
out, so "restore access" is just reactivating the same login, not provisioning a new one.

**`exports:manage`-style chapter scoping, not a new `members:manage`-adjacent permission** — brief
§12/§20 never distinguish "managing a member's profile" from "managing whether that member can log
in," so `grantMemberPortalAccess`/`toggleMemberPortalAccess`/`reviewMemberProfileRevision` all
gate through the same `requireChapterAccess(member.chapterId, "members:manage")` a Chapter Admin
already holds for editing that member directly — not `users:manage` (Super-Admin-only, and about
managing *admin* accounts specifically, a different concern).

**MemberProfile still isn't a separate table — Phase 3/4's "revisit if Phase 11 needs the split"
resolved to no.** A member-submitted edit isn't a second copy of the profile that needs its own
schema; it's a proposed delta that either gets applied to the one real `Member` row or discarded.
`MemberProfileRevision.changes` stores the full proposed field set as JSON (same tradeoff
`Blog.faq`/`AuditLog.metadata` already made) rather than mirroring every editable column into a
parallel table — simpler for content that's rejected as often as approved, and there's exactly one
reader of that JSON shape (`reviewMemberProfileRevision`), not the kind of query surface that
would justify real columns.

**One review action covers all three brief §20 outcomes, not three separate code paths.** Reject
leaves `Member` untouched. Approve and "Edit and Approve" are the same action from the system's
point of view — whatever values are in the review form when Approve is clicked get applied,
whether that's the member's proposal verbatim or admin's own edits on top of it first. Modeling
"Edit and Approve" as a separate mutation from "Approve" would have meant two ways to reach the
identical `Member.update()` call.

**Member article submissions (brief §31) still have no phase.** Brief §12 lists "submit blogs/
articles" as something a logged-in member can do, and Phase 11's login work would have made it
technically reachable, but §31's own workflow ("Admin notified" on submission) leans on Phase 13's
email infrastructure, and — like brief §35's Leads system (flagged in Phase 9) — the brief's own
Phase Structure table (§70) never assigns §31 anywhere. Phase 11's title is specifically "Member
Login + Profile Edit Approval Workflow," not article submission; building it now would be exactly
the early-future-phase scope brief §72 warns against. Whichever future phase picks this up should
also close this gap — noted here and in the Open Decisions table below so it isn't lost twice.

### Ask BWF RAG chatbot (Phase 12)
**Retrieval is plain structured Prisma queries, not vector embeddings.** Confirmed with the user
before building: BWF's public content (3 chapters, a handful of members, a starter blog list) is
small enough that keyword `contains`/`insensitive` search — the same technique the Phase 4 member
directory already uses — covers brief §36's grounding requirement without a pgvector extension or
an embedding-regeneration pipeline that has to stay in sync with every content edit. Revisit only
if member/content volume grows enough that keyword matching starts missing relevant results a
real visitor would expect to find.

**Retrieval is split into a baseline half and a per-message half** (`src/lib/chatbot/
retrieval.ts`) specifically so the system prompt (`src/lib/chatbot/prompt.ts`) can put the stable
half — chapters, categories, FAQs, website content, all foundational and rarely changing — behind
a prompt-cache breakpoint, with the query-dependent half (keyword-matched members/blogs) appended
after it as the volatile tail. A real, low-effort prompt-caching win, not just an API-call
convenience.

**`ChatbotLead` deliberately stays narrow — name/phone/email/requirement, no chapter/category/
member FK columns** — the same "avoid unnecessarily large forms at first interaction" pattern
this project has used since Phase 7's application wizard. An admin who wants to record a matched
member/chapter/category during follow-up uses the existing free-text `notes` field, same as
`MembershipApplication.notes` today. This is also, per `docs/PHASES.md`'s Phase 9 note and the
Open Decisions table below, **one lead source, not brief §35's general Leads system** — no attempt
was made to design `ChatbotLead` as a foundation the future Leads model would extend.

**The chatbot's floating launcher is gated on `ChatbotSettings.isEnabled` alone, not also on
`ANTHROPIC_API_KEY` being set.** These looked redundant at first (why show a launcher for a
chatbot with no key?) but they cover different moments: an admin can legitimately flip the
feature on before a real key exists (the settings page warns about exactly this), and
`/api/chatbot` itself reports `{ unavailable: true }` for the widget to render an honest "not
available" state when hit without a key — same "no dead entry point, but don't over-hide either"
balance as `EMAIL_PROVIDER`'s console-fallback pattern. Caught during this phase's own
verification: an earlier draft gated the launcher on both, which made the "unavailable" fallback
UI unreachable to test and contradicted the settings page's own warning text.

**Lead capture stays reachable even when the live chat is marked unavailable** — initially built
with the "Connect me with BWF" trigger nested inside the same conditional branch as the chat
thread, which hid it exactly when a visitor would most want it (chat down, still want to be
contacted). Caught the same way most RBAC/workflow bugs in this project have been caught — by
actually clicking through the unavailable state during verification, not by reasoning about the
JSX abstractly — and fixed by pulling the lead-capture toggle out to render unconditionally.

**`ANTHROPIC_API_KEY` is not in `src/lib/env.ts`'s strict schema**, matching the established
convention that schema is reserved for vars the app can't boot without — `EMAIL_API_KEY`/
`NEXT_PUBLIC_GA4_MEASUREMENT_ID` aren't there either. Read directly in `src/lib/chatbot/client.ts`
with the same graceful "not configured yet" fallback.

**No new rate-limiting infrastructure** — `/api/chatbot` caps a single conversation at 40 messages
as a cheap guardrail, but there's no per-IP or shared-memory rate limiter, consistent with the
accepted gap already recorded for Phase 2's OTP-request endpoint (no shared memory exists across
serverless instances in the Vercel target to build one cheaply). Worth revisiting if real traffic
makes API cost a concern — brief §37 anticipates this by making the access mode itself
admin-configurable (Public / Login Required / Limited Free Questions), which is the first real
lever before a bespoke rate limiter is needed.

**Model/effort**: `claude-opus-5` (not downgraded for cost — that's the user's call, not an
architectural default to make unilaterally), adaptive thinking, `effort: "medium"` — chat/Q&A
workloads are one of the cases where lower effort holds up well against cost, per current Claude
API cost-tuning guidance, unlike coding/long-horizon agentic work which benefits more from
`high`/`xhigh`.

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
| Real chapter names/locations for the 3 active chapters | Before launch | Seeded as "Chapter 01/02/03" (Chennai) — now live-editable at `/admin/chapters` (not a code change), so this no longer blocks any phase. Rename whenever real names exist. |
| Real business-category taxonomy (Plumbing, Architect, etc.) | Before launch | Seeded with a 10-category starter list grounded in the brief's own examples — live-editable at `/admin/categories`. Refine/expand whenever BWF confirms the real list. |
| Real email provider for OTP (Resend API key) | Phase 2 (before real use) | `sendEmail()` supports Resend already (`EMAIL_PROVIDER=resend` + `EMAIL_API_KEY`) — until set, OTP codes log to the server console instead of sending. Fine for local dev, not for staging/production. SMS OTP was considered and deliberately deferred — email-only for now, architecture doesn't block adding SMS later. |
| Domain name + whether the old site stays live during build | Phase 14–15 | Affects redirect planning and DNS cutover timing. |
| Real photography (or interim placeholder/stock strategy) | Phase 1 (ongoing) | Every image slot is a `MediaPlaceholder` with a shot-list caption in the meantime — see Design System above. Still needs a real answer before launch; placeholders shouldn't ship to production. |
| Real founder/Super Admin credentials | Phase 2 (before real use) | Seed mechanism exists (`npm run db:seed` reads `SEED_SUPER_ADMIN_EMAIL`/`_NAME`/`_PASSWORD` from env) — currently seeded with local-dev-only placeholder credentials, not real ones. |
| Real Neon (or other managed Postgres) connection string | Phase 2 (before staging/prod) | Currently running against a local `prisma dev` database — see Phase 2 entry in `docs/PHASES.md`. Migrations are already tracked in `prisma/migrations/` and will apply cleanly to a real database whenever one exists. |
| WhatsApp Business API + Razorpay business verification | Post-V2 (§71) | Both have real-world verification lead times — worth starting that process independently of the dev timeline if they're wanted eventually. |
| Legal review of Privacy Policy / Terms & Conditions copy | Phase 14 | Site collects member/visitor PII — placeholder pages exist (`/privacy`, `/terms`) but must not launch with AI-drafted legal text unreviewed. |
| Leads system (brief §35) has no phase of its own | Noticed in Phase 9 | Still true after Phase 12 — the brief's Phase Structure table (§70) never assigns brief §35's general Leads model to a phase. Phase 12 built `ChatbotLead`, one lead *source*, not the general model (source/member/chapter/category/status fields brief §35 describes for every lead everywhere) — the dashboard's "New chatbot leads" tile (Phase 12) is real now, but brief §39's general "New leads" tile still has no home. See `docs/PHASES.md` Phase 9 and Phase 12. |
| Member article submissions (brief §31) has no phase of its own | Noticed in Phase 11 | Same gap as Leads above — brief §12 says a logged-in member can "submit blogs/articles," but §31's own workflow and the brief's Phase Structure table (§70) never give it a home. Phase 11 built member login/profile-edit-approval only, per its own title; see `docs/PHASES.md` Phase 11. |
| Real `ANTHROPIC_API_KEY` for the Ask BWF chatbot | Phase 12 (before real use) | `src/lib/chatbot/client.ts` supports it already — until set, `/api/chatbot` reports itself unavailable and the widget shows an honest "not available" state, same pattern as `EMAIL_API_KEY`. Access-mode enforcement (`LOGIN_REQUIRED`/`LIMITED_FREE_QUESTIONS`) is written but couldn't be exercised live in this environment either, since it sits behind the same "is the chatbot configured" gate — see `docs/PHASES.md` Phase 12. |

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
