/**
 * App Store / Play review login (2026-10-26, mobile launch). Apple and Google
 * reviewers must be able to sign in to a members-only app, so this creates a
 * self-contained demo: a hidden DRAFT chapter "BWF App Review (Demo)" with
 * one login (username APPREVIEW) and three demo colleagues, a little sample
 * activity, and an upcoming meeting.
 *
 * Isolation (see src/lib/members/visibility.ts): members of a non-ACTIVE
 * chapter only see/pick their own chapter, and real members never see them;
 * DRAFT-chapter members are hidden from the public site and sitemap. So the
 * reviewer can record referrals etc. without touching real members' data.
 *
 *   npx tsx scripts/create-app-review-demo.ts                    # dry run — prints what it would do
 *   npx tsx scripts/create-app-review-demo.ts --apply            # creates it (or reports it exists)
 *   npx tsx scripts/create-app-review-demo.ts --apply --new-password   # rotates the login's password
 *
 * The password is printed once and never stored in plaintext — paste it
 * into App Store Connect → App Review Information, not into the repo.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { computeActiveSlotKey } from "../src/lib/members/slot";

const apply = process.argv.includes("--apply");
const rotate = process.argv.includes("--new-password");

const CHAPTER = { name: "BWF App Review (Demo)", slug: "bwf-app-review-demo" };
const COMPANY = "BWF Demo Construction Co";
const USERNAME = "APPREVIEW";
// Around Arumbakkam, Chennai — the reviewer's own location won't be near,
// so the review notes point them at the name search instead.
const PEOPLE = [
  { name: "Demo Reviewer", slug: "bwf-demo-reviewer", lat: 13.0732, lng: 80.2113 },
  { name: "Arun Demo", slug: "bwf-demo-arun", lat: 13.0850, lng: 80.2101 },
  { name: "Priya Demo", slug: "bwf-demo-priya", lat: 13.0604, lng: 80.2496 },
  { name: "Karthik Demo", slug: "bwf-demo-karthik", lat: 13.0418, lng: 80.2341 },
];

function newPassword() {
  // 18 chars from a CSPRNG, comfortably over the 12-char minimum.
  return randomBytes(14).toString("base64url").slice(0, 18);
}

async function main() {
  const existing = await db.chapter.findUnique({ where: { slug: CHAPTER.slug } });
  const existingUser = await db.user.findUnique({ where: { username: USERNAME } });

  if (existing || existingUser) {
    console.log(`Demo already exists (chapter: ${existing ? "yes" : "no"}, login ${USERNAME}: ${existingUser ? "yes" : "no"}).`);
    if (existing && existing.status !== "DRAFT") throw new Error(`Chapter ${CHAPTER.slug} is ${existing.status} — it must stay DRAFT to stay hidden.`);
    if (rotate && existingUser) {
      const password = newPassword();
      if (!apply) return console.log("Dry run: would set a new password and sign out its sessions. Add --apply.");
      await db.user.update({
        where: { id: existingUser.id },
        data: { password: await hashPassword(password), sessionVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
      });
      console.log(`New password for ${USERNAME}: ${password}`);
    }
    return;
  }

  const categories = await db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: PEOPLE.length });
  if (categories.length < PEOPLE.length) throw new Error(`Need ${PEOPLE.length} active categories, found ${categories.length}.`);
  const memberRole = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  for (const p of PEOPLE) {
    if (await db.member.findUnique({ where: { slug: p.slug } })) throw new Error(`Member slug ${p.slug} is already taken.`);
  }

  console.log(`Would create: DRAFT chapter "${CHAPTER.name}", company "${COMPANY}", members ${PEOPLE.map((p) => p.name).join(", ")}`);
  console.log(`  categories: ${categories.map((c) => c.name).join(", ")}; login ${USERNAME}; 1 referral, 1 one-to-one, 1 meeting in 14 days.`);
  if (!apply) return console.log("Dry run only — add --apply to create it.");

  const password = newPassword();
  const passwordHash = await hashPassword(password);

  await db.$transaction(async (tx) => {
    const chapter = await tx.chapter.create({ data: { ...CHAPTER, status: "DRAFT" } });
    const company = await tx.company.create({ data: { name: COMPANY } });
    const members = [];
    for (const [i, p] of PEOPLE.entries()) {
      members.push(
        await tx.member.create({
          data: {
            name: p.name,
            slug: p.slug,
            designation: i === 0 ? "App Store reviewer (demo account)" : "Demo member",
            bio: "Demo profile used for app store review. Not a real BWF member.",
            address: "Demo address, Arumbakkam, Chennai",
            locationLabel: "Arumbakkam, Chennai",
            latitude: p.lat,
            longitude: p.lng,
            companyId: company.id,
            chapterId: chapter.id,
            categoryId: categories[i].id,
            activeSlotKey: computeActiveSlotKey("ACTIVE", chapter.id, categories[i].id),
            rosterEligible: false,
          },
        }),
      );
    }
    const user = await tx.user.create({
      data: {
        name: PEOPLE[0].name,
        username: USERNAME,
        password: passwordHash,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: memberRole.id } },
      },
    });
    await tx.member.update({ where: { id: members[0].id }, data: { userId: user.id } });

    await tx.referral.create({
      data: { type: "OUTSIDE", description: "Sample: villa construction enquiry", fromMemberId: members[1].id, toMemberId: members[0].id },
    });
    await tx.oneToOne.create({ data: { memberId: members[2].id, withMemberId: members[0].id, notes: "Sample one-to-one" } });
    await tx.meeting.create({
      data: {
        title: "Demo Chapter Meeting",
        chapterId: chapter.id,
        startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        venue: "Demo venue, Chennai",
        agenda: "Sample meeting for app review.",
        reminderEnabled: false,
        visitorRegistrationEnabled: false,
      },
    });
  });

  console.log(`\nCreated. App Store review login:\n  Username: ${USERNAME}\n  Password: ${password}\n(Shown once — store it in App Store Connect → App Review Information.)`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
