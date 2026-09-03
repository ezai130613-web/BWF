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
  { key: "events:manage", label: "Manage events" },
  { key: "visitors:manage", label: "Manage visitor registrations" },
  { key: "exports:manage", label: "Export member data (Excel/CSV/PDF)" },
  { key: "reports:manage", label: "Manage weekly report recipients & schedule" },
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
    "events:manage",
    "visitors:manage",
    "exports:manage",
    "reports:manage",
  ],
  // Chapter Admin's access is scoped per-chapter (UserRole.chapterId), not a
  // blanket permission — enforced by requireChapterAccess(), same as
  // meetings:manage/events:manage/visitors:manage below (mirrors
  // members:manage — see requireChapterAccess in src/lib/auth/rbac.ts).
  // exports:manage follows the same scoped pattern (brief §45: "Chapter
  // Admin can export ONLY their chapter") — granted via chapter scoping, not
  // a blanket row here. reports:manage (the weekly-report recipient/schedule
  // config) is NOT scoped the same way — the brief never gives Chapter Admin
  // a role in that configuration, only in exporting their own chapter's data.
  CHAPTER_ADMIN: [],
  MEMBER: [],
};

// Placeholder names — real chapter names/locations are an open decision
// (docs/ARCHITECTURE.md). Seeded ACTIVE (not DRAFT) so the public site has
// something real to query instead of the Phase 1 hardcoded panels; rename
// via /admin/chapters whenever real names exist.
const CHAPTERS = [
  { name: "Chapter 01", slug: "chapter-01", location: "Chennai" },
  { name: "Chapter 02", slug: "chapter-02", location: "Chennai" },
  { name: "Chapter 03", slug: "chapter-03", location: "Chennai" },
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
      create: { ...chapter, status: "ACTIVE" },
    });
  }

  for (const name of CATEGORIES) {
    const slug = slugify(name);
    await db.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  for (const role of CHAPTER_LEADERSHIP_ROLES) {
    await db.chapterLeadershipRole.upsert({ where: { key: role.key }, update: {}, create: role });
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
  ] as const;

  for (const content of WEBSITE_CONTENT) {
    await db.websiteContent.upsert({
      where: { key: content.key },
      update: {},
      create: content,
    });
  }

  // Weekly report schedule (brief §46) — singleton row, disabled by default.
  // No recipients seeded ("do not hardcode recipients") — added via
  // /admin/reports whenever real inboxes exist to send to.
  await db.weeklyReportSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", isEnabled: false, dayOfWeek: 1 },
  });

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
