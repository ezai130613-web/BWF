import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const ROLES = [
  { key: "SUPER_ADMIN", label: "Super Admin", description: "Founder / ownership — complete access." },
  { key: "CENTRAL_ADMIN", label: "Central Admin", description: "BWF management." },
  { key: "CHAPTER_ADMIN", label: "Chapter Admin", description: "Scoped to one chapter (scoping added in Phase 3)." },
  { key: "MEMBER", label: "Member", description: "Member self-service portal (added in Phase 11)." },
] as const;

const PERMISSIONS = [
  { key: "users:manage", label: "Manage admin users" },
  { key: "roles:manage", label: "Manage roles & permissions" },
  { key: "audit_log:view", label: "View activity/audit log" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.key),
  CENTRAL_ADMIN: ["audit_log:view"],
  CHAPTER_ADMIN: [],
  MEMBER: [],
};

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
