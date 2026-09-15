import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { slugify } from "../src/lib/slugify";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ROLES = [
  { key: "SUPER_ADMIN", label: "Super Admin", description: "Founder / ownership — complete access." },
  { key: "CENTRAL_ADMIN", label: "Central Admin", description: "BWF management." },
  { key: "CHAPTER_ADMIN", label: "Chapter Admin", description: "Scoped to one chapter via UserRole.chapterId." },
  { key: "MEMBER", label: "Member", description: "Member self-service portal (added in Phase 11)." },
] as const;

const PERMISSIONS = [
  { key: "users:manage", label: "Manage admin users" },
  { key: "roles:manage", label: "Manage roles & permissions" },
  { key: "audit_log:view", label: "View activity/audit log" },
  { key: "chapters:manage", label: "Manage chapters" },
  { key: "categories:manage", label: "Manage categories" },
  { key: "companies:manage", label: "Manage companies" },
  { key: "members:manage", label: "Manage members" },
  { key: "blogs:manage", label: "Manage blog posts, categories, tags & authors" },
  { key: "testimonials:manage", label: "Manage testimonials" },
  { key: "content:manage", label: "Manage website content & FAQs" },
  { key: "feedback:view", label: "View feedback" },
  { key: "applications:manage", label: "Manage membership applications" },
  { key: "meetings:manage", label: "Manage chapter meetings" },
  { key: "visitors:manage", label: "Manage visitor registrations" },
  { key: "chief_guests:manage", label: "Manage the Chief Guests homepage carousel" },
  { key: "points_config:manage", label: "Manage BWF App points/scoring values" },
  { key: "app_activity:view", label: "View BWF App activity (referrals, TYS, 1-2-1s, Power Dates, Conclaves, points)" },
  { key: "roster:manage", label: "Generate chapter Roster Sheet PDFs" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  // Brief §10 — Central Admin manages members/companies/chapters/categories/
  // blogs/testimonials/content, but not other admin accounts or roles/
  // permissions (Super-Admin-only, §9). Feedback is deliberately excluded —
  // brief §34 is explicit: "Feedback must only be visible to Super Admin
  // unless Super Admin explicitly grants permission later."
  CENTRAL_ADMIN: [
    "audit_log:view",
    "chapters:manage",
    "categories:manage",
    "companies:manage",
    "members:manage",
    "blogs:manage",
    "testimonials:manage",
    "content:manage",
    "applications:manage",
    "meetings:manage",
    "visitors:manage",
    "chief_guests:manage",
    "points_config:manage",
    "app_activity:view",
    "roster:manage",
  ],
  // Chapter Admin's access is scoped per-chapter (UserRole.chapterId), not a
  // blanket permission — enforced by requireChapterAccess(), same as
  // meetings:manage/visitors:manage/roster:manage below (mirrors
  // members:manage — see requireChapterAccess in src/lib/auth/rbac.ts).
  // app_activity:view is scoped the same way
  // — a Chapter Admin sees only Referral/ThankYouSlip/OneToOne/PowerDate/
  // Conclave rows and leaderboard entries touching their own chapter's
  // members (either side of the interaction), via getChapterScope() in
  // src/app/admin/(dashboard)/app-activity/page.tsx. Read-only by design —
  // this data is a private record between members, not admin-moderated
  // content like Blog/Testimonial submissions.
  CHAPTER_ADMIN: [],
  MEMBER: [],
};

// Placeholder names — real chapter names/locations are an open decision
// (docs/ARCHITECTURE.md). Seeded ACTIVE (not DRAFT) so the public site has
// something real to query instead of the Phase 1 hardcoded panels; rename
// via /admin/chapters whenever real names exist. Meeting schedule/venue ARE
// real, confirmed values (user, 2026-09-09) — all four chapters meet at
// Hotel Aadithya, Vadapalani. Chapter 04 is real too, seeded COMING_SOON
// (not yet launched, but publicly browsable — see ChapterStatus's doc
// comment) rather than the placeholder-name treatment the others get.
const MEETING_VENUE = { meetingVenue: "Hotel Aadithya", meetingAddress: "Vadapalani, Chennai" } as const;

const CHAPTERS = [
  { name: "Chapter 01", slug: "chapter-01", location: "Chennai", status: "ACTIVE", meetingSchedule: "2nd & 4th Thursday", ...MEETING_VENUE },
  { name: "Chapter 02", slug: "chapter-02", location: "Chennai", status: "ACTIVE", meetingSchedule: "2nd & 4th Friday", ...MEETING_VENUE },
  { name: "Chapter 03", slug: "chapter-03", location: "Chennai", status: "ACTIVE", meetingSchedule: "1st & 3rd Wednesday", ...MEETING_VENUE },
  { name: "Chapter 04", slug: "chapter-04", location: "Chennai", status: "COMING_SOON", meetingSchedule: "1st & 3rd Tuesday", ...MEETING_VENUE },
] as const;

// Starter taxonomy grounded in the brief's own examples (§14, §16, §52) and
// general construction-ecosystem categories — not a final list, admin can
// add/edit via /admin/categories.
const CATEGORIES = [
  "Architect",
  "Civil Contractor",
  "Interior Designer",
  "Structural Engineer",
  "Electrical Contractor",
  "Plumbing Contractor",
  "Real Estate Developer",
  "Building Material Supplier",
  "Project Management Consultant",
  "Landscape Architect",
] as const;

const CHAPTER_LEADERSHIP_ROLES = [
  { key: "PRESIDENT", label: "President" },
  { key: "VICE_PRESIDENT", label: "Vice President" },
  { key: "SECRETARY", label: "Secretary" },
  { key: "COORDINATOR", label: "Coordinator" },
  { key: "DIRECTOR", label: "Director" },
  { key: "TREASURER", label: "Treasurer" },
  { key: "FOUNDER", label: "Founder" },
  { key: "CO_FOUNDER", label: "Co-Founder" },
] as const;

// Phase 20 Batch 3 — Roster Sheet module's "Coordinators" catalog (originally
// "Meeting Roles"/"Host" wording, renamed 2026-09-15 per client correction —
// these are coordinator duties, not hosting duties).
// Consolidates the 3 reference roster PDFs' slightly different wording for
// the same duty across chapters (e.g. "Digital Host" / "Digital Marketing
// Coordinator" both become DIGITAL_HOST) into one canonical, admin-
// extensible list — same "don't hardcode roles" pattern as
// CHAPTER_LEADERSHIP_ROLES, managed going forward via /admin/roster-roles.
// Keys are left as *_HOST for continuity with existing data/PDF code that
// matches on key — only the admin/public-facing label changed.
const ROSTER_ROLES = [
  { key: "CHIEF_GUEST_HOST", label: "Chief Guest Coordinator", order: 1 },
  { key: "VISITOR_HOST", label: "Visitor Coordinator", order: 2 },
  { key: "MEETING_HOST", label: "Meeting Coordinator", order: 3 },
  { key: "ATTENDANCE_HOST", label: "Attendance Coordinator", order: 4 },
  { key: "HOT_SEAT_HOST", label: "Hot Seat Coordinator", order: 5 },
  { key: "MENTOR_HOST", label: "Mentor Coordinator", order: 6 },
  { key: "GIVE_AND_ASK_HOST", label: "Give and Ask Coordinator", order: 7 },
  { key: "ONE_TO_ONE_HOST", label: "One-to-One Coordinator", order: 8 },
  { key: "SOCIAL_COORDINATOR", label: "Social Coordinator", order: 9 },
  { key: "POWER_DATE_HOST", label: "Power Date Coordinator", order: 10 },
  { key: "DIGITAL_HOST", label: "Digital Coordinator", order: 11 },
  { key: "WHATSAPP_HOST", label: "WhatsApp Coordinator", order: 12 },
  { key: "THANKS_NOTE_HOST", label: "Thanks Note Coordinator", order: 13 },
  { key: "TIME_MANAGEMENT_HOST", label: "Time Management Coordinator", order: 14 },
  { key: "CONCLAVE_HOST", label: "Conclave Coordinator", order: 15 },
  { key: "RANKING_HOST", label: "Ranking Coordinator", order: 16 },
] as const;

// Brief §30's suggested initial list — admin can add/edit via /admin/blog-categories.
const BLOG_CATEGORIES = [
  "Construction Guides",
  "Architecture",
  "Builders & Developers",
  "Interior Design",
  "Construction Materials",
  "Engineering",
  "Contractors",
  "Chennai Construction Industry",
  "Business Networking",
  "BWF News",
  "Member Success Stories",
  "Construction FAQs",
] as const;

async function main() {
  for (const role of ROLES) {
    await db.role.upsert({ where: { key: role.key }, update: {}, create: role });
  }

  for (const permission of PERMISSIONS) {
    await db.permission.upsert({ where: { key: permission.key }, update: {}, create: permission });
  }

  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
    for (const permissionKey of permissionKeys) {
      const permission = await db.permission.findUniqueOrThrow({ where: { key: permissionKey } });
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  for (const chapter of CHAPTERS) {
    await db.chapter.upsert({
      where: { slug: chapter.slug },
      update: {},
      create: chapter,
    });
  }

  for (const name of CATEGORIES) {
    const slug = slugify(name);
    await db.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  for (const role of CHAPTER_LEADERSHIP_ROLES) {
    await db.chapterLeadershipRole.upsert({ where: { key: role.key }, update: {}, create: role });
  }

  for (const role of ROSTER_ROLES) {
    await db.rosterRole.upsert({
      where: { key: role.key },
      update: { label: role.label, order: role.order },
      create: role,
    });
  }

  for (const name of BLOG_CATEGORIES) {
    const slug = slugify(name);
    await db.blogCategory.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  // Default author so admin can publish immediately — represents BWF itself,
  // not a specific member. Additional authors (BWF Team, guest contributors,
  // member-linked) are created via /admin/authors as needed.
  await db.author.upsert({
    where: { slug: "builders-world-forum" },
    update: {},
    create: { name: "Builders World Forum", slug: "builders-world-forum" },
  });

  // Website content blocks (brief §62) — seeded as structure only (key,
  // label, section), values left null except where promoting an existing
  // hardcoded string (the footer tagline) into the CMS so nothing visually
  // changes on first deploy. No fabricated "about BWF" copy or contact
  // details — admin fills those in via /admin/content once real info exists.
  const WEBSITE_CONTENT = [
    {
      key: "footer.tagline",
      label: "Footer tagline",
      section: "Footer",
      value:
        "A private, chapter-based business community for Chennai's construction ecosystem — one category, one member, per chapter.",
    },
    { key: "contact.phone", label: "Phone number", section: "Contact", value: null },
    { key: "contact.email", label: "Email address", section: "Contact", value: null },
    { key: "contact.address", label: "Office address", section: "Contact", value: null },
    { key: "about.intro", label: "About page introduction", section: "About", value: null },
    // Client correction spec (2026-09-09) §29/§44 — visitor pricing given as
    // fixed fact in the spec itself (seeded as real values); annual fee
    // promoted from its previous hardcoded home in the Terms page (§4) for
    // the same "nothing visually changes on first deploy" reason as
    // footer.tagline above. Monthly meeting charge has no prior figure
    // anywhere — left null, same "don't fabricate real business data"
    // pattern as everything else admin must fill in.
    // Revised 2026-09-09 (later same day) — user split visitor pricing into
    // prebooking (online, cheaper) vs onspot (walk-in) tiers, both + GST.
    // The online /visit form only ever offers the prebooking rate (that IS
    // what prebooking means); onspot is informational context shown on the
    // Chapters page pricing section only.
    {
      key: "fees.visitorPrebookMeetingOnly",
      label: "Visitor fee — prebooking, meeting only (₹, + GST)",
      section: "Fees",
      value: "300",
    },
    {
      key: "fees.visitorPrebookMeetingBreakfast",
      label: "Visitor fee — prebooking, meeting + breakfast (₹, + GST)",
      section: "Fees",
      value: "800",
    },
    {
      key: "fees.visitorOnspotMeetingOnly",
      label: "Visitor fee — onspot, meeting only (₹, + GST)",
      section: "Fees",
      value: "400",
    },
    {
      key: "fees.visitorOnspotMeetingBreakfast",
      label: "Visitor fee — onspot, meeting + breakfast (₹, + GST)",
      section: "Fees",
      value: "800",
    },
    {
      key: "fees.annualMembership",
      label: "Annual membership fee (₹)",
      section: "Fees",
      value: "20000",
    },
    { key: "fees.monthlyMeeting", label: "Monthly meeting charge (₹)", section: "Fees", value: null },
    // User-supplied real BWF bank accounts (2026-09-09) — two SEPARATE
    // accounts, not one: Meeting/visitor payment goes to the ICICI account,
    // Membership payment to a different IDFC FIRST account. Do not merge
    // these or show one account's details next to the other's QR — a real
    // user correction caught exactly this risk before it shipped. QR images
    // are the user's own real assets (public/images/payment/), not
    // generated — MediaUploadField still lets admin replace either later.
    { key: "payment.qrCodeUrl", label: "Meeting payment QR code image", section: "Payment", value: "/images/payment/meeting-qr.jpeg" },
    { key: "payment.bankAccountName", label: "Meeting payment — account name", section: "Payment", value: "M/S. Builders World Forum" },
    { key: "payment.bankAccountNumber", label: "Meeting payment — account number", section: "Payment", value: "057705004211" },
    { key: "payment.bankIfsc", label: "Meeting payment — IFSC code", section: "Payment", value: "ICIC0000577" },
    { key: "payment.upiId", label: "Meeting payment — UPI ID", section: "Payment", value: "msbuildersworldforum.eazypay@icici" },
    { key: "payment.bankName", label: "Meeting payment — bank & branch", section: "Payment", value: "ICICI Bank, Kodambakkam" },

    { key: "payment.membershipQrCodeUrl", label: "Membership payment QR code image", section: "Payment", value: "/images/payment/membership-qr.jpeg" },
    { key: "payment.membershipBankAccountName", label: "Membership payment — account name", section: "Payment", value: "Builders World Forum" },
    { key: "payment.membershipBankAccountNumber", label: "Membership payment — account number", section: "Payment", value: "10254810262" },
    { key: "payment.membershipBankIfsc", label: "Membership payment — IFSC code", section: "Payment", value: "IDFB0081831" },
    { key: "payment.membershipSwiftCode", label: "Membership payment — SWIFT code", section: "Payment", value: "IDFBINBBMUM" },
    { key: "payment.membershipUpiId", label: "Membership payment — UPI ID", section: "Payment", value: "buildersworld@idfcbank" },
    { key: "payment.membershipBankName", label: "Membership payment — bank & branch", section: "Payment", value: "IDFC FIRST Bank, Chennai - Iyyapanthangal Branch" },
    // "ADDITIONAL REQUIREMENT — TOTAL BUSINESS GENERATED" — spec is explicit:
    // "Do not invent or display a business-generated value until BWF
    // provides the verified current figure." Raw rupee integer (not
    // pre-formatted text) per the spec's own "prefer storing the actual
    // rupee value... makes future formatting and automation easier."
    {
      key: "stats.businessGeneratedInr",
      label: "Total business generated (₹, raw number e.g. 257500000)",
      section: "Stats",
      value: null,
    },
    {
      key: "stats.businessGeneratedUpdatedAt",
      label: "Updated as of (optional, e.g. \"September 2026\" — shown only if filled in)",
      section: "Stats",
      value: null,
    },
    // Phase 20 Batch 3 — the Roster Sheet's final page. Everything else on
    // that page (tagline, self-intro block, pledge text) is fixed structural
    // copy identical across all 3 reference chapters, same "structural spec
    // copy" treatment as the Chapters page's terminology cards — this QR is
    // the one genuinely per-deployment asset, same pattern as payment.qrCodeUrl.
    {
      key: "roster.visitorFeedbackQrUrl",
      label: "Roster Sheet — visitor feedback QR code image",
      section: "Roster",
      value: null,
    },
  ] as const;

  for (const content of WEBSITE_CONTENT) {
    await db.websiteContent.upsert({
      where: { key: content.key },
      update: {},
      create: content,
    });
  }

  // BWF App points/scoring (client correction spec) — one row per activity
  // type, seeded at 0 points. Spec is explicit: "do not hard-code the
  // scoring values" — real numbers are BWF's own call, set via
  // /admin/points-config, not something to guess at here.
  const ACTIVITY_TYPES = [
    "REFERRAL",
    "THANK_YOU_SLIP",
    "ONE_TO_ONE",
    "POWER_DATE",
    "CONCLAVE",
    "VISITOR",
    "CONSUMER",
    "CHIEF_GUEST",
    "INDUCTION",
  ] as const;
  for (const activityType of ACTIVITY_TYPES) {
    await db.pointsConfig.upsert({ where: { activityType }, update: {}, create: { activityType, points: 0 } });
  }

  const seedEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const seedName = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";

  if (!seedEmail || !seedPassword) {
    console.warn(
      "\nSEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set — skipping Super Admin account creation. Set them in .env and re-run `npm run db:seed` to create the first login.\n",
    );
  } else {
    const superAdminRole = await db.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
    const passwordHash = await hashPassword(seedPassword);

    const user = await db.user.upsert({
      where: { email: seedEmail.toLowerCase() },
      update: {},
      create: { email: seedEmail.toLowerCase(), name: seedName, password: passwordHash },
    });

    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: user.id, roleId: superAdminRole.id },
    });

    console.log(`\nSuper Admin ready: ${seedEmail}\n`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
