"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, requireRecentAuth } from "@/lib/auth/rbac";
import { hashPassword } from "@/lib/auth/password";
import { TEMPORARY_PASSWORD, assignUsernames } from "@/lib/auth/member-credentials";
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

/** One salted hash per account (never one hash shared across users). */
async function hashAll(count: number) {
  const hashes: string[] = [];
  for (let i = 0; i < count; i += HASH_BATCH) {
    hashes.push(...(await Promise.all(Array.from({ length: Math.min(HASH_BATCH, count - i) }, () => hashPassword(TEMPORARY_PASSWORD)))));
  }
  return hashes;
}

/** Creates a login for every ACTIVE member that doesn't have one yet. */
export async function generateMemberCredentials(): Promise<CredentialsResult> {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session);

  const members = await db.member.findMany({
    where: { status: "ACTIVE", userId: null },
    include: { chapter: true, category: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });
  if (members.length === 0) return { issued: [], skipped: 0 };

  const memberRole = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  const usernameByMember = await assignUsernames(members);
  const usernames = members.map((m) => usernameByMember.get(m.id)!);
  const passwords = members.map(() => TEMPORARY_PASSWORD);
  const hashes = await hashAll(members.length);

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

  await logActivity({
    userId: session.user.id,
    action: "member.credentials_generated",
    entity: "Member",
    metadata: { count: issued.length, skipped },
  });

  revalidatePath("/admin/member-credentials");
  return { issued, skipped };
}

/** Resets not-yet-activated members back to the temporary password (e.g. after lockouts or a hijack attempt). */
export async function reissueTemporaryCredentials(memberIds: string[]): Promise<CredentialsResult> {
  const session = await requirePermission("users:manage");
  requireRecentAuth(session);

  const members = await db.member.findMany({
    where: { id: { in: memberIds }, user: { mustChangePassword: true, username: { not: null } } },
    include: { chapter: true, category: true, user: true },
    orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
  });

  const passwords = members.map(() => TEMPORARY_PASSWORD);
  const hashes = await hashAll(members.length);
  const now = new Date();

  await db.$transaction(
    members.map((m, i) =>
      db.user.update({
        where: { id: m.userId! },
        // sessionVersion bump signs out anyone still holding the old
        // temporary password's session; clears any lockout from failed tries.
        data: {
          password: hashes[i],
          temporaryPasswordIssuedAt: now,
          sessionVersion: { increment: 1 },
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
    ),
  );

  await logActivity({
    userId: session.user.id,
    action: "member.credentials_reissued",
    entity: "Member",
    metadata: { count: members.length },
  });

  revalidatePath("/admin/member-credentials");
  return {
    issued: members.map((m, i) => ({
      memberId: m.id,
      memberName: m.name,
      chapter: m.chapter.name,
      category: m.category.name,
      username: m.user!.username!,
      password: passwords[i],
    })),
    skipped: memberIds.length - members.length,
  };
}
