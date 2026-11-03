/**
 * Per-person access for the two Central Admins (2026-11-03, client request):
 * Website + Membership panels only — their role's default permissions minus
 * marketing:manage and accounts:view. Super Admin can change either person
 * later from Users → Edit access. Also puts those two permissions back on the
 * Central Admin role, which an earlier same-day run had removed role-wide.
 *
 *   npx tsx scripts/set-central-admin-access.ts            # dry run
 *   npx tsx scripts/set-central-admin-access.ts --apply    # does it
 *
 * Needs migration 20261103120000_per_user_access applied first.
 */
import "dotenv/config";
import { db } from "@/lib/db";

const EMAILS = ["buildersworldforum006@gmail.com", "buildersworldforum5@gmail.com"];
const ROLE_DEFAULTS_RESTORE = ["marketing:manage", "accounts:view"];
const EXCLUDE = new Set(["marketing:manage", "accounts:view"]);

async function main() {
  const apply = process.argv.includes("--apply");
  const role = await db.role.findUniqueOrThrow({ where: { key: "CENTRAL_ADMIN" }, include: { permissions: { include: { permission: true } } } });
  const restore = await db.permission.findMany({ where: { key: { in: ROLE_DEFAULTS_RESTORE } } });
  const roleKeys = new Set([...role.permissions.map((p) => p.permission.key), ...restore.map((p) => p.key)]);
  const personal = await db.permission.findMany({ where: { key: { in: [...roleKeys].filter((k) => !EXCLUDE.has(k)) } } });
  const users = await db.user.findMany({ where: { email: { in: EMAILS } } });
  if (users.length !== EMAILS.length) throw new Error(`Expected ${EMAILS.length} users, found ${users.length}.`);

  console.log(`CENTRAL_ADMIN role: add back ${ROLE_DEFAULTS_RESTORE.join(", ")}`);
  console.log(`Custom access for ${EMAILS.join(", ")}:\n  ${personal.map((p) => p.key).sort().join("\n  ")}`);
  if (!apply) return console.log("\nDry run — re-run with --apply.");

  await db.$transaction(async (tx) => {
    for (const p of restore) {
      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
    for (const u of users) {
      await tx.userPermission.deleteMany({ where: { userId: u.id } });
      await tx.userPermission.createMany({ data: personal.map((p) => ({ userId: u.id, permissionId: p.id })) });
      await tx.user.update({ where: { id: u.id }, data: { customAccess: true } });
    }
  });
  console.log("\nApplied.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
