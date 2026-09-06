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
  `emerald-950/900/800/700/600`, `gold-300/400/500/600`, `ivory-100/200`, `slate-400/500`. Public
  site only for now — admin/member get their own lighter, denser token set when those phases
  land (brief §14 is explicit that admin should not inherit the theatrical public theme).
- **Component primitives**: hand-built (`src/components/ui/`), not a component library —
  `Button` (via `class-variance-authority` for typed variants), `Container`, `SectionLabel`,
  `MediaPlaceholder`. No Radix/shadcn — the brief is explicit the site must not read as a
  default component-library template, and this component surface is small enough that a
  headless-primitives dependency wasn't worth the tradeoff yet. Revisit if Phase 2+ needs real
  overlay/dialog/combobox behavior (RBAC forms, admin tables) — Radix is the natural choice then
  since it doesn't impose visual opinions.
- **Photography**: real photography is fully sourced as of 2026-09-04. Any image slot without a
  real photo still falls back to `<MediaPlaceholder brief="...">` — a textured gradient block with
  a corner label describing what should be shot/sourced for that exact slot — but nothing on the
  live site currently hits that fallback. Member/Blog/Event slots go through
  `<PhotoSlot src={...} ...>` (`src/components/ui/photo-slot.tsx`): it renders the admin-supplied
  `photoUrl` / `featuredImageUrl` / `imageUrl` via `next/image` (`unoptimized` by default, since
  these are arbitrary admin-pasted URLs with no `remotePatterns` allowlist — no server-side fetch
  of untrusted hosts) when present, falling back to `MediaPlaceholder` when not — so a *new*
  member/post/event with no photo yet still degrades gracefully. Homepage and Chapters have no
  per-record field to hang a real photo off (they're BWF's own curated brand imagery, not
  admin-editable per item); the user supplied real photography for both directly, checked into
  `public/images/` (`homepage-*.jpg`, `chapters/chapter-0N-{portrait,card,hero}.jpg`) and wired via
  the same `<PhotoSlot>` component with `unoptimized={false}` (same-origin files, safe to run
  through Next's built-in optimizer). Chapter photo lookup is a plain slug-keyed map in
  `src/lib/chapters/photos.ts` — a new chapter with no entry falls back to `MediaPlaceholder`
  automatically, same graceful-degradation pattern as the admin-supplied slots.
  Two of the delivered images (both Chapter directory cards + portraits, and the three "Inside
  BWF" homepage shots) shipped as delivered; four — Homepage Hero and all three Chapter Heroes —
  needed a fix first: they were AI-generated composites with large headline text already baked
  into the image (colliding with the site's own live overlaid heading), removed via a masked
  inpainting pass before being checked in. See the Phase 1 entry in `docs/PHASES.md` for the full
  account, including a real gotcha: Next's dev image optimizer caches by request URL, not by
  source file content, so overwriting an image at the same path silently keeps serving the old
  cached bytes until `.next` is cleared.

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

**Access-denied UX — resolved 2026-09-04 (backlog #14).** Every RBAC check in `rbac.ts` now
calls `next/navigation`'s `forbidden()` instead of throwing a custom `ForbiddenError`, paired
with `src/app/admin/(dashboard)/forbidden.tsx` for the UI (requires `experimental.authInterrupts`
in `next.config.ts` — still an experimental Next API as of this version, per its own docs). The
previous approach threw a plain `Error` and read `error.name`/`error.message` in
`(dashboard)/error.tsx` to render a friendly screen — worked in local dev, but Next.js redacts
both fields for errors thrown from a Server Component in production (only a generic message +
`digest` survive, to avoid leaking implementation details), so in a real deployed build every
out-of-scope-URL visit still fell through to the generic crash message. `forbidden()` is Next's
own first-class navigation interrupt (the same mechanism `notFound()` uses), so it isn't subject
to that redaction. Confirmed the distinction actually mattered, not just in theory: built and ran
a real production server (`next build && next start` — dev mode masks this class of bug
entirely), created a real Chapter Admin test account, and verified live — `/admin/users`
(`requirePermission`, a global-only permission) returned a genuine HTTP `403` with the friendly
screen and the sidebar/layout still intact; a member record in a different chapter
(`requireChapterAccess`) did the same; the Chapter Admin's own in-scope pages still returned a
normal `200`. All test data (user, member, company) deleted afterward. The old
`(dashboard)/error.tsx` stays, simplified, for genuine unexpected errors — `forbidden()` calls
never reach it now.

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
Assigning members to roles is fully self-service via `/admin/chapters/[id]`. **Resolved
2026-09-04 (backlog #9)**: adding a *new role type* is now also self-service, at
`/admin/leadership-roles` — a create-only admin page (deliberately no edit/delete, same
precedent as `BlogCategory`'s admin UI) that derives the machine `key` from the label (e.g.
"Treasurer" → `TREASURER`) and rejects a duplicate. No code elsewhere ever hardcoded a role
key, so any label an admin types becomes immediately available on every chapter's leadership
form. Verified live: added "Treasurer" through the real admin UI, confirmed the duplicate
guard rejects re-adding it case-insensitively, confirmed it's the same
`db.chapterLeadershipRole.findMany()` query the chapter-detail dropdown reads from.

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

**Media fields (photo/brochure/video) are URL-only** — plain `String?` columns on the model,
unchanged since Phase 3. **Resolved 2026-09-04 (backlog #8)**: real Cloudflare R2 object storage
is wired up (`src/lib/storage.ts`) and every one of these fields — Member photo/brochure/video,
Company logo, Testimonial image/video, Blog featured/OG image, Author photo, Event image — now
has a real upload path via `MediaUploadField` (`src/components/ui/media-upload-field.tsx`): the
browser uploads straight to R2 through a presigned PUT URL from `POST /api/uploads`
(`src/app/api/uploads/route.ts`), so file bytes never pass through a Next.js server function. The
URL text input stays editable alongside the upload button — degrades to manual entry if
`STORAGE_*` env vars aren't set (same pattern as `EMAIL_API_KEY`/`ANTHROPIC_API_KEY`), and stays
the only way to satisfy `videoUrl`'s "direct file or Google Drive only" constraint (brief §47) —
still a content-moderation judgment call, not something upload validation enforces. Verified live:
real browser upload → real R2 object → saved to a real Company row → confirmed publicly
readable, screenshotted. One real bug caught only by that live test (not by the standalone script
check first): R2 has no CORS policy by default, so a browser's presigned PUT was blocked until a
CORS policy (`AllowedOrigins: ["*"]`, PUT/GET) was added on the bucket — the presigned URL itself
is the actual auth boundary (time-boxed, single-key, content-type-pinned), not CORS.

**Search** (`/members`) is plain Postgres `ILIKE` (`contains`, `mode: "insensitive"`) across
name/company/services/specialisations — no search index (Postgres full-text or external) yet.
Fine at this scale; revisit if the member count grows enough that this gets slow, no earlier.
Results are grouped chapter-wise per brief §18, with no ranking beyond that grouping (brief
explicitly asks to avoid rankings that favor members).

**Pagination** — **resolved 2026-09-04 (backlog #10)**: 24 members per page (`PAGE_SIZE` in
`src/app/(public)/members/page.tsx`), plain `?page=N` query param alongside the existing
`q`/`chapter`/`category` params — no client JS, same "works without JS, shareable links"
principle the filters already followed. `db.member.count()` (same `where`) runs alongside the
paginated `findMany()` to compute total pages; an out-of-range, negative, or non-numeric `page`
value clamps to a valid page rather than erroring or 404ing. The chapter-wise grouping still
applies per page — a chapter with members split across a page boundary shows a second,
continued section on the next page, same as any grouped+paginated list. Verified live: seeded
27 test members across the 3 real chapters (respecting the one-active-member-per-category-per-
chapter constraint), confirmed 24/3 split across two pages, Previous/Next disabled at the right
ends, clamping behavior on `?page=99`/`?page=-5`/`?page=abc` — then deleted all the test data.
`Pagination` (`src/components/ui/pagination.tsx`) is a small standalone component so any future
paginated list (Insights, Events, admin tables) can reuse it rather than reinventing.

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
or creates a new one. **Resolved 2026-09-04 (backlog #12)**: matching is now fuzzy —
`findMatchingCompany`/`normalizeCompanyName` (`src/lib/companies/match.ts`) strip case,
punctuation, whitespace, and a trailing legal-entity suffix (Pvt Ltd, LLC, Inc, etc.) before
comparing, so "Acme Construction Pvt Ltd" and "Acme Construction Pvt. Ltd." collapse to the same
company instead of creating a duplicate. Deliberately *not* typo-tolerant
(Levenshtein/trigram similarity) — that risks silently merging two genuinely different companies
with similar names, which is worse than the duplicate this fixes; a human-confirmed "did you
mean" step would be the right next move if formatting normalization alone isn't enough in
practice. Fetches all companies and compares in JS rather than a DB-level fuzzy match — no new
extension/index needed at this scale (same call the rate-limiter and other small-table code in
this app already makes). Verified live: seeded an existing company and an application whose
`companyName` was a case/punctuation/whitespace variant of it, converted through the real admin
UI, confirmed via direct DB query that the existing Company row was reused (no duplicate
created) — then deleted the test data.

**Resolved 2026-09-04 (backlog #11)**: `convertApplicationToMember` now follows the same
`useActionState` + `{error?: string}` return convention as every other admin form action in this
codebase, instead of throwing — a new `ConvertApplicationForm` client component
(`src/components/admin/convert-application-form.tsx`) replaces the old plain
`<form action={convertApplicationToMember.bind(null, id)}>`. The slot-taken case renders as a red
inline message under the button, same place/style as every other form error in the admin, instead
of Next's generic route error boundary. Verified live both ways: seeded a real chapter+category
slot conflict and confirmed the inline message renders with the page fully intact (not the error
boundary); seeded a conflict-free application and confirmed the happy path still converts
correctly — then deleted all the test data.

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
meeting/event's live status, registration-enabled flag, and deadline server-side before
creating the row — the same discipline `submitApplication` uses for chapter availability in
Phase 7, for the same reason: the page could be stale by the time someone submits.

**Event capacity is enforced atomically — resolved 2026-09-04 (backlog #13).** The re-check
above used to be a plain `count()` then `create()`, a textbook TOCTOU race: two concurrent
submissions right at the last slot could both read "under capacity" and both succeed,
overshooting the cap. `createVisitorWithCapacityCheck()` in the same file now does both inside
one `Serializable`-isolation transaction, so Postgres itself detects the write skew and aborts
one side — closing the actual data-integrity gap, not just narrowing the window. Two real,
non-obvious things only turned up by forcing genuine concurrency (8 truly-simultaneous
submissions against a capacity-3 event via 8 separate Playwright browser contexts, not
sequential calls) rather than reasoning about the fix on paper:
- The write conflict does **not** surface as the documented `P2034` `PrismaClientKnownRequestError`
  — at least not with `@prisma/adapter-pg` on Prisma 7. It's an `Error [DriverAdapterError]` whose
  `.cause` carries Postgres's raw SQLSTATE (`originalCode: "40001"`) and a
  `kind: "TransactionWriteConflict"` tag instead. `isRetryableTransactionError()` checks the raw
  SQLSTATE (plus `P2034` for safety) rather than trusting only Prisma's documented code.
- A burst of concurrent transactions can also fail with `P2028` ("unable to start a transaction
  in the given time") purely from this app's Postgres connection pool being capped at 5
  connections app-wide (`src/lib/db.ts`) — a different failure class from the write conflict
  above, unrelated to whether the event is actually full, and also worth retrying rather than
  surfacing as a hard error. `maxWait`/`timeout` on the transaction are raised so this is the
  rarer fallback, not the common case; a short jittered delay before each retry avoids every
  waiting request retrying in lockstep and re-creating the same contention.

Verified live: reset a capacity-3 event to zero registrations, fired 8 truly-concurrent
submissions, confirmed via direct DB query that exactly 3 Visitor rows were created (all within
half a second of each other, proving real concurrency rather than accidental serialization) and
the other 5 received the existing "This event has reached capacity." inline error, with no
server crash. Along the way, found and deliberately did **not** fix an unrelated bug: with a
real `EMAIL_API_KEY` configured, `notifyVisitorRegistered` throwing (e.g. Resend rejecting a
malformed/test recipient address) crashes the whole `registerVisitor` action with a 500 *after*
the Visitor row already committed — the registration silently succeeds while the visitor sees a
generic error. Worth its own backlog item; out of scope for the capacity race this session was
about.

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
`mysql2`/`deepmerge-ts` overrides for a Prisma-tooling transitive dependency. **Re-checked
2026-09-06 (backlog #15), still needed**: exceljs's latest stable (still `4.4.0`) and even its
newest prerelease still declare `uuid: ^8.3.0` — nothing upstream to drop the override for yet.

**PDF table layout — three real bugs found and fixed 2026-09-06 (backlog #16), only visible at
real scale/content.** The hand-drawn table above was written and only exercised against ~4 short
test rows through Phase 9; re-tested with a real 500-row export containing genuinely long values
(the seeded category list's own "Project Management Consultant" is 30 characters) and found three
overlapping issues in `toPdfBuffer()` (`src/lib/reports/member-export.ts`), fixed together since
each one only became visible once the previous was fixed:
1. **Row overlap when a cell wraps.** A fixed 20pt row height didn't account for PDFKit's default
   text wrapping — a cell whose content didn't fit its column's width (any sufficiently long
   category/company name) wrapped to 2+ lines that silently overlapped the next row. The
   `ellipsis: true` on the original `doc.text()` calls looks like an attempt to prevent this, but
   PDFKit only truncates-with-ellipsis when a single-line `height` is also constrained, which
   nothing here set — it had no effect. Fixed by measuring every cell's real wrapped height via
   `doc.heightOfString()` and using the tallest per row, rather than truncating real operational
   data (company/category names) down to whatever fits on one line.
2. **Columns touching with zero gutter.** Columns sit exactly `columnWidth` apart with no gap;
   `doc.widthOfString("Membership Status")` in the 6-column layout measures 82.9pt against an
   83.3pt column — it fits on one line, but butts directly against the next column's text with no
   visible separation ("Membership StatusChapter" reading as one run-on phrase). Fixed with a 6pt
   `columnGutter` subtracted from the text width actually passed to `doc.text()`, while columns
   themselves stay `columnWidth` apart.
3. **Header height was still fixed.** Fixing #2 pushed "Membership Status" just past its
   one-line width in the 6-column layout, wrapping the *header* label itself — which
   `drawHeader()` didn't account for either, so the divider line (and the first data row) drew
   right through the wrapped second line. Same `heightOfString()`-based fix, applied to the header.

Verified visually, not just by re-reading the code: rendered actual pages from the real 500-row
PDF (via `pdfjs-dist` + `@napi-rs/canvas`, temporary dev-only tooling, `--no-save`) to confirm no
overlap anywhere, and cross-checked all 500 member numbers are present exactly once via text
extraction (`pdf-parse`) after each fix, since intentional multi-line wrapping means a naive
substring count needs whitespace-normalizing first. Page count is correct and expected to grow
slightly from a naive row estimate now that wrapped rows correctly reserve real vertical space
(14 pages at 4 columns, 16 at 6 — was silently 14 for both before the fix, i.e. artificially
short from the overlap). All test data (500 members, 1 company) deleted afterward.

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

**"New leads" is the one brief §39 base-list metric this phase omits.** *(Resolved 2026-09-06 —
Phase 15 gave the Leads system brief §35 a real phase/home, and the dashboard tile a real number.
Left as written below for the historical reasoning; see Phase 15 in `docs/PHASES.md` for what
actually shipped.)* The Leads system (brief §35) has no phase of its own in the brief's own Phase
Structure table (§70) — it isn't Phase 9's "Reporting + Exports + Weekly Reports," and nothing else
claims it either (chatbot lead capture in Phase 12 covers one lead *source*, not the general Leads
model brief §35 describes). Building a Leads model now, just to populate one dashboard tile, would
be exactly the kind of early future-phase feature brief §72 warns against. Following the Phase 1
precedent (an honest "coming soon" over a fabricated number), the tile is simply absent rather than
showing a fake zero. Whichever future phase does add Leads should also give this dashboard tile a
home — noted in both here and the Phase 9 follow-ups so it isn't lost.

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
system now has a phase (Phase 15), but its `MEMBER_PROFILE_ENQUIRY` source still has no such form
to populate it from; this stays the plan for whenever one is built.

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

**Member article submissions (brief §31) — resolved 2026-09-06, Phase 16 (backlog #21).** Brief
§12 lists "submit blogs/articles" as something a logged-in member can do; §31's own workflow
("Member submits → Draft stored → Admin notified → Admin reviews → Approved/Rejected/Edited →
Published") reuses the `Blog` model directly — that model's own Phase 5 doc comment had already
anticipated exactly this, tagging a submission with `submittedByMemberId` +
`BlogSubmissionStatus` (`PENDING`/`APPROVED`/`REJECTED`) rather than a parallel table, so every
existing blog admin feature (SEO, tags, FAQ, scheduling) works on a member's post unchanged.
Approving and "editing then approving" are one code path (the existing `updateBlog` save action,
same precedent as `reviewMemberProfileRevision`) — it only flips `PENDING → APPROVED` the moment
an admin's save actually publishes/schedules the post, not on an intermediate draft save while
still reviewing. "If author is a member: link article to their member profile" is automatic via
`Author.memberId`'s existing unique constraint (Phase 5), not admin busywork. See `docs/PHASES.md`
Phase 16 for the full verification (a real submit → approve → publish loop and a real reject loop,
both driven through the actual UI, not just reasoned about).

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
`MembershipApplication.notes` today. This is also, per `docs/PHASES.md`'s Phase 9 note, **one lead
source, not brief §35's general Leads system** — no attempt was made to design `ChatbotLead` as a
foundation the Leads model would extend when Phase 15 eventually built it; `ChatbotLead` keeps its
own detailed record exactly as before, and a `CHATBOT`-sourced `Lead` row is created *alongside* it
via `recordLead()`, not by touching `ChatbotLead` itself.

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
single interface so Resend/Postmark/SES can be swapped without touching call sites. All 8 real
Phase 13 triggers are wired on top of it now; a concrete production provider (Resend API key) is
still an open decision (see below) — every send in this project's own verification has gone
through the console fallback, never a real inbox.

### Email / notification automation (Phase 13)
**Templates centralized in one file (`src/lib/notifications.ts`), password-reset emails
deliberately kept out of it.** Five business-workflow triggers share one file so "who gets
emailed when" is auditable in one place rather than spread across 5 action files. Password reset
is the one exception — it lives in `src/lib/auth/password-reset.ts` instead, mirroring how the
existing login-OTP email has always lived inline in `src/lib/auth/otp-login.ts`: auth emails are
tightly coupled to OTP code generation and the non-enumeration response shape, a different
concern from a business-workflow notification.

**"Business email" (brief's own phrase, §49: "do not hardcode business email") is a plain env var
(`NOTIFICATION_EMAIL`), not a database-configured recipient list.** `WeeklyReportRecipient`
already exists as a configured list, but it's specifically for the report attachment — reusing it
for "notify someone about a new application" would conflate two different subscriptions. Skipped
silently when unset, same no-dead-feature rule as `NEXT_PUBLIC_WHATSAPP_NUMBER`.

**Password reset reuses `OtpChallenge` with a `purpose` discriminator, not a parallel token
table.** The schema comment on `OtpChallenge.purpose` has said "room for PASSWORD_RESET etc.
later" since Phase 2 — this phase is that later. Kept as sibling functions
(`requestPasswordReset`/`resetPassword` in `password-reset.ts`) alongside `requestOtp`/
`authorizeOtpLogin` rather than extending the login functions themselves, because a reset
challenge and a login challenge now need to behave differently at the point they're consumed.

**Building this surfaced a real pre-existing gap, not introduced by this phase but exposed by
it**: `authorizeOtpLogin()` had never checked `OtpChallenge.purpose` at all — harmless while every
challenge was implicitly a login challenge (the only kind that existed), but the moment a second
purpose existed, a leaked/observed password-reset code could have been replayed as a login
credential, skipping the password factor entirely. Fixed in the same change that introduced the
second purpose (`authorizeOtpLogin` now requires `purpose === "LOGIN"`), not left as a follow-up —
the same "fix it in the change that exposed it" instinct as Phase 11's `requireAdminSession()`
role-check gap.

**Completing a password reset bumps `User.sessionVersion` and clears the login lockout together.**
The `sessionVersion` bump reuses the exact mechanism `toggleUserStatus()`'s suspend path already
established (checked on every request by `config.ts`'s `jwt()` callback) — a reset is exactly the
kind of event that should invalidate every session already issued, same as a suspension. Clearing
`failedLoginCount`/`lockedUntil` reflects that successfully completing a reset is a *stronger*
proof of identity than the password a lockout exists to protect.

**A real production bug was caught by actually running the reset flow in a browser, not by
reading the code**: `src/proxy.ts` only ever exempted the literal `/admin/login` and
`/member/login` paths from its "no valid session → redirect to login" check, so the new
`/admin/reset-password`/`/member/reset-password` pages were being redirected straight back to
login before this was caught — by definition, anyone reaching a password-reset page does not have
a valid session yet. Fixed by extending both exemptions. Worth remembering for any future
public-but-under-`/admin`-or-`/member` route: `proxy.ts`'s matcher covers the whole path prefix,
not just the pages that existed when it was written.

**Weekly report send is a daily cron that mostly no-ops, not a per-weekday schedule.** Vercel
Cron's schedule granularity (`vercel.json`) is coarser than `WeeklyReportSettings.dayOfWeek`
needs, so the route itself compares today's weekday against the stored setting and returns early
otherwise — the same "compute at read/invocation time instead of building a bespoke scheduler"
choice already made for `SCHEDULED` blog posts (Phase 5) and `SCHEDULED` events. Never actually
fired by real Vercel Cron in this environment (no deployment exists yet) — only manually curled
with the `CRON_SECRET` header, which is the same credential Vercel's own cron requests carry.

### Production readiness (Phase 14)

**This phase was an audit-then-harden pass, not a new-feature phase** — a direct grep-and-read
review of the existing codebase against brief §55/§56/§60, rather than exploring for patterns to
follow (there was nothing analogous already built). Four real gaps were found and fixed; the audit
itself, and what it found *already* satisfied, is worth recording as much as the fixes.

**Security checklist (brief §55/§56), item by item:**

| Requirement | Status | Where |
|---|---|---|
| Strong password hashing | ✅ | Argon2id, `src/lib/auth/password.ts` (Phase 0) |
| Secure authentication + OTP/second factor | ✅ | NextAuth JWT + `otp-login.ts` (Phase 2) |
| Extra Super Admin protection | ✅ | `requireRecentAuth()` step-up for high-risk actions (Phase 2/11) |
| RBAC enforced server-side | ✅ | `requirePermission`/`requireChapterAccess`, tested every phase since 3 |
| Input validation | ✅ | Zod on every Server Action/route body |
| CSRF protection | ✅ | Server Actions' built-in Origin-header check; NextAuth's own CSRF token |
| XSS protection | ✅ (hardened Phase 14) | React's default escaping everywhere, plus `sanitize-html` on the one `dangerouslySetInnerHTML` call that renders user-authored content (blog Markdown) |
| SQL injection prevention | ✅ | Prisma parameterizes every query; no raw SQL in application code |
| Secure cookies | ✅ | NextAuth's secure-by-default cookie config (httpOnly, sameSite, `secure` in production) — never overridden |
| Rate limiting / form abuse protection | ✅ (Phase 14) | `src/lib/rate-limit.ts`, see below |
| Secure file upload validation | ✅ (2026-09-04, backlog #8) | `POST /api/uploads` requires a signed-in session, rate-limits per user (30/10min), and validates content-type against a per-kind allowlist (`MEDIA_KINDS` in `src/lib/storage.ts`) and size before issuing a presigned URL — the file itself never transits the server, so there's no server-side body to scan, only the request metadata to validate |
| Permission checks for every protected action | ✅ | Audited live every phase since Phase 3 |
| Audit logs | ✅ | `AuditLog` + `logActivity()`, every mutating action since Phase 2 |
| Backups | ✅ (documented, Phase 14) | See below — a managed-provider feature, not application code |
| No secrets in frontend code | ✅ | Only `NEXT_PUBLIC_*` vars reach the client bundle; none of them are secrets (grepped to confirm) |
| No sensitive error info exposed publicly | ✅ | Every API/action error response is a hand-written string (grepped every `NextResponse.json({error...` call); Next's production build already suppresses stack traces |
| Mandatory MFA (Super Admin) | ✅ (all admins) | OTP-as-second-factor applies to every admin role, not just Super Admin — brief's example, not a distinct unmet requirement |
| Shorter privileged-session expiration | Deliberately not built | Phase 11 already reasoned `requireRecentAuth()`'s step-up check is the intended mechanism instead of a shorter blanket session — revisited this phase, same conclusion holds |
| Permanent deletion / role-change confirmation | N/A | No hard-delete of sensitive records exists anywhere (suspend, not delete); `requireRecentAuth()` already gates role changes |
| Sensitive activity alerts | Brief says "later" | Not built, matching the brief's own framing |

**Rate limiting is Postgres-backed, not a new external service.** Upstash/Redis is the more
common serverless-rate-limit pattern, but it needs real credentials this project doesn't have —
a `RateLimitHit` table (find-or-reset-then-increment, non-atomic by design) is a legitimate
alternative at this traffic scale (a private, chapter-based community site, not a
high-concurrency public API). `getClientIp()` reads `x-forwarded-for` via `next/headers` — real
on Vercel, one shared "unknown" bucket for local/direct connections, which only ever affects local
testing.

**Blog sanitization is additive, not a reversal of the Phase 5 trust-boundary reasoning.** Content
is still always admin-authored/reviewed before publish — that reasoning was and is correct about
*why this wasn't urgent*. Sanitizing anyway reflects that a production security review's job is
defense-in-depth regardless of the primary trust boundary: a compromised admin session (phishing,
credential stuffing) is a realistic threat model this review is specifically supposed to consider,
and `marked` passes raw HTML straight through with zero escaping by design (its own maintainers
recommend a downstream sanitizer, not a built-in `sanitize: true` option, which was removed years
ago for being unreliable).

**Caching is `revalidate` as a ceiling on top of existing on-demand `revalidatePath()`, not a
replacement for it.** Every admin mutation's existing `revalidatePath()` call still fires
instantly — confirmed live, not assumed, by adding a real FAQ and watching it appear on the public
page immediately despite the new 1-hour ceiling. The ceiling's only job is stopping a page from
hitting the database on every single request when nothing has changed. Two real pages were
deliberately excluded despite fitting the "read-heavy public page" pattern: `/insights` and
`/members` (both take `searchParams` — Next.js correctly treats a page reading them as dynamic
regardless of `revalidate`, and they're genuinely live search/filter views, not static content),
and `/events/[slug]` (shows a live "X / capacity registered" count that gates whether registration
is even open — caching it would let the page show stale availability, a real functional
regression worse than the DB-load savings are worth).

**Two real bugs were caught by an actual Lighthouse run against a production build, not by
reading the code** — `robots.ts`'s bare `/member` disallow entry was a *prefix* match blocking the
entirely public `/members` directory from search indexing (fixed with the `/member$` exact-path
pattern), and the public member-search form's three inputs had no accessible name (fixed with
`aria-label`). Neither would have been found by code review alone — both only surfaced because the
audit step included actually running the tool the brief's own "strong Core Web Vitals" language
implies using, against a real production server (`next build && next start`; Lighthouse's ISR/
caching behavior and even some scores differ meaningfully from dev mode).

**Backup/recovery runbook** (brief §57 — "Automatic database backups required"): the brief's own
preferred stack (page 5 — "Vercel + managed PostgreSQL + managed object storage") already provides
this as a platform feature, not something this application needs to implement. Neon (the
documented preferred provider) takes automatic backups and supports point-in-time recovery via
its branching model — restoring means creating a new branch from a timestamp before the incident
and repointing `DATABASE_URL` at it, not running a custom restore script. A manual `pg_dump`
export is the documented fallback for an out-of-band snapshot (e.g. before a risky migration).
Object storage (R2, wired up 2026-09-04 per backlog #8) should have versioning enabled on the
`bwfmedia` bucket for the same reason — **not yet done**, a real remaining follow-up, not
something this wiring pass turned on. This paragraph originally noted no real Neon project or R2
bucket existed to test any of this against; that's since changed for both (see Phase 2's Neon
entry and backlog #8) — "automatic backups happen" is still a documented expectation of the
chosen providers rather than a manually tested restore, since deliberately triggering data loss
against a real environment to test recovery isn't a check worth running outside an actual
incident.

**Deployment runbook** lives in `README.md`'s new "## Deployment" section rather than here, since
it's the operational document someone actually deploying would open first. `prisma migrate
deploy` is documented as an explicit manual/CI step, deliberately **not** folded into the `build`
script — auto-running schema migrations on every single Vercel build (including preview deploys
of unrelated changes) is a real, avoidable risk for a project that has otherwise been consistently
careful about database operations (the shadow-DB incident's non-destructive-recipe discipline,
the "never run destructive commands" rule). The one build-script change this phase *did* make
(`postinstall: prisma generate`) is different in kind — it only regenerates a client from the
schema already in the repo, it can't touch data, and skipping it doesn't defer risk, it just
breaks the build.

## Open decisions (not blocking Phase 0, but needed before the phase that touches them)

These were flagged during the initial brief review and don't have answers yet. Listed here so
they aren't lost, with the phase they'd first block:

| Decision | Needed by | Notes |
|---|---|---|
| ~~Display serif + UI sans-serif typefaces~~ | ~~Phase 1~~ | **Resolved Phase 1**: Fraunces + Inter. |
| ~~Headless component primitives~~ | ~~Phase 1~~ | **Resolved Phase 1**: hand-built, no library — see Design System above. |
| Real chapter names/locations for the 3 active chapters | Before launch | Seeded as "Chapter 01/02/03" (Chennai) — now live-editable at `/admin/chapters` (not a code change), so this no longer blocks any phase. Rename whenever real names exist. |
| Real business-category taxonomy (Plumbing, Architect, etc.) | Before launch | Seeded with a 10-category starter list grounded in the brief's own examples — live-editable at `/admin/categories`. Refine/expand whenever BWF confirms the real list. |
| Real email provider (Resend API key) | Phase 2 (before real use) | **Partially resolved 2026-09-04**, **advanced 2026-09-06**: a real Resend API key is set locally and verified with a real send. The real domain (`buildersworldforum.com`) is now registered with Resend via its Domains API, which returned the DKIM/SPF/MX DNS records needed to verify it — see `docs/PHASES.md`'s Phase 2 follow-ups for the exact values. Adding them requires DNS access at GoDaddy (where the domain's nameservers point), which the user doesn't have yet — it sits with the previous website developer. `EMAIL_FROM_ADDRESS` stays on Resend's shared `onboarding@resend.dev` test address until the domain actually verifies. |
| ~~Real `NOTIFICATION_EMAIL` (business alert address)~~ | ~~Phase 13~~ | **Resolved 2026-09-06**: set to `buildersworldforum1@gmail.com` (the user's choice among the real admin addresses already in use) — admin alerts for new applications/chatbot leads now reach a real inbox instead of skipping silently. |
| Real Vercel deployment (needed to actually fire the weekly-report cron) | Phase 13/14 | `vercel.json`'s daily schedule has never fired for real — only manually curled locally with `CRON_SECRET`. Not blocking now (Phase 14/15's deployment work), but the cron send itself is unverified against real infrastructure until then. |
| Domain name + whether the old site stays live during build | Phase 14–15 | **Domain half answered 2026-09-06**: `buildersworldforum.com` is the real domain (already live, registered via GoDaddy) — no separate decision needed there. Still open: whether the old site stays live during the build, and DNS/registrar access itself (see the email-provider row above — same blocker). |
| ~~Real photography for Homepage + Chapters~~ | ~~Phase 1~~ | **Resolved 2026-09-04**: see Design System above — all 13 shots (Homepage's 5 brand images + 2 per chapter) sourced and wired in via `public/images/`. |
| ~~Real founder/Super Admin credentials~~ | ~~Phase 2~~ | **Resolved 2026-09-06**: real Super Admin (`abiramanathank1@gmail.com`) and two Central Admin accounts created; old placeholder (`admin@bwf.local`) suspended, not deleted. See `docs/PHASES.md`'s Phase 2 follow-ups. |
| ~~Real Neon (or other managed Postgres) connection string~~ | ~~Phase 2~~ | **Resolved 2026-09-04**: real Neon project provisioned (`dev`/`staging`/`main` branches, AWS Singapore region) — see Phase 2 entry in `docs/PHASES.md` for the migration-ordering bug this surfaced and fixed along the way. |
| WhatsApp Business API + Razorpay business verification | Post-V2 (§71) | Both have real-world verification lead times — worth starting that process independently of the dev timeline if they're wanted eventually. |
| Legal review of Privacy Policy / Terms & Conditions copy | Phase 14 | Site collects member/visitor PII. `/privacy` and `/terms` now carry a full first-draft policy (2026-09-04, grounded in the actual data model/integrations — see `src/components/legal/legal-page-shell.tsx`), visibly marked "draft — pending legal review" with bracketed placeholders (entity name, jurisdiction, grievance officer, fee terms, liability/indemnification clauses). Still must not launch as final until a real lawyer reviews it and those placeholders are filled in. |
| ~~Leads system (brief §35) has no phase of its own~~ | Noticed in Phase 9 | **Resolved 2026-09-06** (backlog #17) — given Phase 15, a real `Lead` model aggregating across `MembershipApplication`/`Visitor`/`ChatbotLead` plus the site's other lead-generating flows, `/admin/leads`, and a real "New leads" dashboard tile (replacing the narrower "New chatbot leads" stand-in Phase 12 shipped). Two of brief §35's 7 listed sources ("Member profile enquiry", "Contact form") still have no real capture form on the site and so don't populate a `Lead` yet — flagged as Phase 15's own follow-up, not silently dropped. See `docs/PHASES.md` Phase 15. |
| Admin Analytics (brief §51) is explicitly "Later" per the brief's own wording | Noted since Phase 10 | **Built anyway 2026-09-06** (backlog #20), at the user's explicit request after being told plainly this is a deliberate brief deferral (unlike Leads' plain "unassigned" gap) and that most of what §51 asks for needs real GA4 data that doesn't exist yet (#19). `getAdminAnalytics()`/`/admin/analytics` cover only what's honestly derivable today — `Lead`/`MembershipApplication`/`Visitor` counts and conversion rates — with an explicit on-page note (not a silent gap, not a fabricated number) for the GA4-dependent metrics §51 also asks for. See `docs/PHASES.md` Phase 15's addendum. |
| ~~Member article submissions (brief §31) has no phase of its own~~ | Noticed in Phase 11 | **Resolved 2026-09-06** (backlog #21) — Phase 16, reusing the `Blog` model directly (new `submittedByMemberId`/`BlogSubmissionStatus` fields) rather than a parallel submissions table, new `/member/articles` + admin review surfaced on the existing `/admin/blogs` pages. See `docs/PHASES.md` Phase 16. |
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
