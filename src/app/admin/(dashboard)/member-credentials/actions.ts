"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, requireRecentAuth } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";
import { assignUsernames, generateTemporaryPassword } from "@/lib/auth/member-credentials";
import { memberCredentialsPdf } from "@/lib/auth/credentials-pdf";
import { logActivity } from "@/lib/audit";

/**
 * Bulk temporary member credentials (2026-10-03). Super Admin only
 * (`users:manage`), behind the same 15-minute recent-auth step-up as other
 * account-level actions. Usernames/password scheme: see
 * src/lib/auth/member-credentials.ts. Only hashes are stored.
 */

export type IssuedCredential = {
  memberId: string;
  memberName: string;
  chapter: string;
  category: string;
  username: string;
  password: string;
};

export type CredentialsResult = { error?: string; issued?: IssuedCredential[]; skipped?: number };

const HASH_BATCH = 8;
const UPDATE_BATCH = 20;

/** A fresh temporary password and its salted hash per account. */
async function freshPasswords(count: number) {
  const passwords = Array.from({ length: count }, generateTemporaryPassword);
  const hashes: string[] = [];
  for (let i = 0; i < count; i += HASH_BATCH) {
    hashes.push(...(await Promise.all(passwords.slice(i, i + HASH_BATCH).map(hashPassword))));
  }
  return { passwords, hashes };
}

/** Logins for every ACTIVE member that doesn't have one yet (no auth check — callers do it). */
async function createMissingLogins(): Promise<{ issued: IssuedCredential[]; skipped: number }> {
  const members = await db.member.findMany({
    where: { status: "ACTIVE", userId: null },
    include: { chapter: true, category: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });
  if (members.length === 0) return { issued: [], skipped: 0 };

  const memberRole = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  const usernameByMember = await assignUsernames(members);
  const usernames = members.map((m) => usernameByMember.get(m.id)!);
  const { passwords, hashes } = await freshPasswords(members.length);

  const issued: IssuedCredential[] = [];
  let skipped = 0;
  const now = new Date();

  for (const [i, member] of members.entries()) {
    try {
      await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: member.name,
            username: usernames[i],
            password: hashes[i],
            mustChangePassword: true,
            temporaryPasswordIssuedAt: now,
            roles: { create: { roleId: memberRole.id } },
          },
        });
        // Guarded link: if another admin granted this member access in the
        // meantime, roll this member's new login back rather than orphan it.
        const linked = await tx.member.updateMany({ where: { id: member.id, userId: null }, data: { userId: user.id } });
        if (linked.count !== 1) throw new Error("already-linked");
      });
      issued.push({
        memberId: member.id,
        memberName: member.name,
        chapter: member.chapter.name,
        category: member.category.name,
        username: usernames[i],
        password: passwords[i],
      });
    } catch {
      skipped += 1;
    }
  }
  return { issued, skipped };
}

/** Creates a login for every ACTIVE member that doesn't have one yet. */
export async function generateMemberCredentials(): Promise<CredentialsResult> {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session);

  const { issued, skipped } = await createMissingLogins();
  if (issued.length === 0 && skipped === 0) return { issued: [], skipped: 0 };

  await logActivity({
    userId: session.user.id,
    action: "member.credentials_generated",
    entity: "Member",
    metadata: { count: issued.length, skipped },
  });

  revalidatePath("/admin/member-credentials");
  return { issued, skipped };
}

type ResettableMember = {
  id: string;
  name: string;
  userId: string | null;
  chapter: { name: string };
  category: { name: string };
  user: { username: string | null; email: string | null } | null;
};

/**
 * New temporary password for each given member's login, back on the forced
 * first-login activation. Username and email are kept. sessionVersion bump
 * signs out every open session; clears any lockout from failed tries.
 */
async function resetLogins(members: ResettableMember[]): Promise<IssuedCredential[]> {
  const { passwords, hashes } = await freshPasswords(members.length);
  const now = new Date();

  // Small batches: one transaction over ~150 updates outran Prisma's 5s
  // transaction timeout against the hosted database (2026-10-21).
  for (let start = 0; start < members.length; start += UPDATE_BATCH) {
    await db.$transaction(
      members.slice(start, start + UPDATE_BATCH).map((m, j) =>
        db.user.update({
          where: { id: m.userId! },
          data: {
            password: hashes[start + j],
            mustChangePassword: true,
            temporaryPasswordIssuedAt: now,
            sessionVersion: { increment: 1 },
            failedLoginCount: 0,
            lockedUntil: null,
          },
        }),
      ),
    );
  }

  return members.map((m, i) => ({
    memberId: m.id,
    memberName: m.name,
    chapter: m.chapter.name,
    category: m.category.name,
    // The one member granted access by email before usernames existed signs in with that email.
    username: m.user!.username ?? m.user!.email ?? "—",
    password: passwords[i],
  }));
}

/** Resets not-yet-activated members back to a fresh temporary password (e.g. after lockouts or a hijack attempt). */
export async function reissueTemporaryCredentials(memberIds: string[]): Promise<CredentialsResult> {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session);

  const members = await db.member.findMany({
    where: { id: { in: memberIds }, user: { mustChangePassword: true, username: { not: null } } },
    include: { chapter: true, category: true, user: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

  const issued = await resetLogins(members);

  await logActivity({
    userId: session.user.id,
    action: "member.credentials_reissued",
    entity: "Member",
    metadata: { count: members.length },
  });

  revalidatePath("/admin/member-credentials");
  return { issued, skipped: memberIds.length - members.length };
}

/**
 * Fresh start for every ACTIVE member (client request, 2026-10-21): creates
 * logins for members without one, and gives every existing member login —
 * activated or not — a new temporary password and forces activation again.
 * Accounts that also hold an admin role are left alone.
 */
export async function resetAllMemberCredentials(): Promise<CredentialsResult> {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session);

  const created = await createMissingLogins();
  const createdIds = new Set(created.issued.map((c) => c.memberId));

  const members = (
    await db.member.findMany({
      where: {
        status: "ACTIVE",
        userId: { not: null },
        user: { roles: { none: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
      },
      include: { chapter: true, category: true, user: true },
      orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
    })
  ).filter((m) => !createdIds.has(m.id));

  const reset = await resetLogins(members);
  const issued = [...created.issued, ...reset].sort(
    (a, b) => a.chapter.localeCompare(b.chapter) || a.memberName.localeCompare(b.memberName),
  );

  await logActivity({
    userId: session.user.id,
    action: "member.credentials_reset_all",
    entity: "Member",
    metadata: { reset: reset.length, created: created.issued.length, skipped: created.skipped },
  });

  revalidatePath("/admin/member-credentials");
  return { issued, skipped: created.skipped };
}

/** The just-issued sheet as a PDF (base64). Built from what the admin's browser holds; nothing is stored. */
export async function credentialsPdf(rows: IssuedCredential[]): Promise<{ error?: string; base64?: string }> {
  await requirePermission("users:manage");
  if (rows.length === 0) return { error: "Nothing to put in the PDF." };
  const pdf = await memberCredentialsPdf(rows);
  return { base64: pdf.toString("base64") };
}
