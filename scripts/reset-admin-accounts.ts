/**
 * Admin account reset (2026-11-03, client request). Makes the list below the
 * complete set of admin logins:
 *   - each listed email is created or updated: role set, the given password
 *     set, account unlocked + ACTIVE, and NOT forced to change the password
 *     (they can change it any time from "Change password" in the sidebar, and
 *     reset it by email from /admin/login → "Forgot password").
 *   - every other admin login is suspended (reversible from Users) and signed
 *     out; a login that is also a member keeps its member access and only
 *     loses its admin roles.
 *   (Central Admin access is set per person afterwards — see
 *   scripts/set-central-admin-access.ts.)
 *
 *   npx tsx scripts/reset-admin-accounts.ts --password <pw>           # dry run
 *   npx tsx scripts/reset-admin-accounts.ts --password <pw> --apply   # does it
 *
 * The password is passed on the command line so it never lands in the repo.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";

const ACCOUNTS: { email: string; name: string; role: string }[] = [
  { email: "md@abhivairavan.com", name: "Abiramanathan K", role: "SUPER_ADMIN" },
  { email: "harishalagappanbwf@gmail.com", name: "Harish Alagappan", role: "SUPER_ADMIN" },
  { email: "arasubandc@gmail.com", name: "Arasu", role: "SUPER_ADMIN" },
  { email: "buildersworldforum006@gmail.com", name: "BWF Central Admin", role: "CENTRAL_ADMIN" },
  { email: "buildersworldforum5@gmail.com", name: "BWF Central Admin", role: "CENTRAL_ADMIN" },
  { email: "accbwf@gmail.com", name: "BWF Accounts", role: "ACCOUNTS" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  const pwIndex = process.argv.indexOf("--password");
  const password = pwIndex > -1 ? process.argv[pwIndex + 1] : undefined;
  if (!password || password.length < 4) throw new Error("Pass --password <at least 4 characters>.");

  const roles = await db.role.findMany({ where: { key: { in: ADMIN_ROLE_KEYS } } });
  const roleId = (key: string) => roles.find((r) => r.key === key)!.id;
  const passwordHash = await hashPassword(password);
  const keep = new Set(ACCOUNTS.map((a) => a.email));

  const plan: string[] = [];
  const existing = await db.user.findMany({
    where: { email: { in: [...keep] } },
    include: { roles: { include: { role: true } } },
  });
  for (const a of ACCOUNTS) {
    const u = existing.find((e) => e.email === a.email);
    plan.push(u ? `UPDATE ${a.email} (${u.roles.map((r) => r.role.key).join("+")} → ${a.role}), password set, no forced change` : `CREATE ${a.email} as ${a.role}`);
  }

  const others = await db.user.findMany({
    where: { email: { notIn: [...keep] }, roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
    include: { roles: { include: { role: true } } },
  });
  // email is nullable, and `notIn` skips NULLs — fetch username-only admins too.
  const nullEmailAdmins = await db.user.findMany({
    where: { email: null, roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
    include: { roles: { include: { role: true } } },
  });
  const retire = [...others, ...nullEmailAdmins];
  for (const u of retire) {
    const isMember = u.roles.some((r) => r.role.key === "MEMBER");
    plan.push(`${isMember ? "REMOVE ADMIN ROLES (keeps member login)" : "SUSPEND"} ${u.email ?? u.username ?? u.id} (${u.name}, ${u.roles.map((r) => r.role.key).join("+")}, ${u.status})`);
  }

  console.log(plan.join("\n"));
  if (!apply) {
    console.log("\nDry run — re-run with --apply to make these changes.");
    return;
  }

  await db.$transaction(async (tx) => {
    for (const a of ACCOUNTS) {
      const u = existing.find((e) => e.email === a.email);
      const common = {
        password: passwordHash,
        status: "ACTIVE" as const,
        mustChangePassword: false,
        temporaryPasswordIssuedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
      };
      if (u) {
        await tx.userRole.deleteMany({ where: { userId: u.id, role: { key: { in: ADMIN_ROLE_KEYS } } } });
        await tx.userRole.create({ data: { userId: u.id, roleId: roleId(a.role) } });
        await tx.user.update({ where: { id: u.id }, data: { ...common, sessionVersion: { increment: 1 } } });
      } else {
        await tx.user.create({
          data: { ...common, email: a.email, name: a.name, roles: { create: { roleId: roleId(a.role) } } },
        });
      }
    }

    for (const u of retire) {
      const isMember = u.roles.some((r) => r.role.key === "MEMBER");
      // A member keeps their member login and just loses admin access; a
      // pure admin login keeps its role (so Users still shows what it was)
      // but is suspended, so it can't sign in.
      if (isMember) {
        await tx.userRole.deleteMany({ where: { userId: u.id, role: { key: { in: ADMIN_ROLE_KEYS } } } });
      }
      await tx.user.update({
        where: { id: u.id },
        data: { ...(isMember ? {} : { status: "SUSPENDED" as const }), sessionVersion: { increment: 1 } },
      });
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
