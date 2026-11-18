"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { istToUtc } from "@/lib/ist";
import { istDateKey } from "@/lib/payments/dates";
import { addDaysKey, termYearAt } from "@/lib/payments/membership-term";
import { membershipEditScope } from "@/lib/members/membership-access";
import { getNumberSetting, setNumberSetting } from "@/lib/settings";
import { requireAdminSession } from "@/lib/auth/rbac";

export type BulkMembershipState = { error?: string; saved?: number };

/** Save every row of the bulk "Joining dates & paid years" table in one go. Only rows that changed are written. */
export async function saveMembershipBulk(_prev: BulkMembershipState | undefined, formData: FormData): Promise<BulkMembershipState> {
  const scope = await membershipEditScope();
  const session = await requireAdminSession();
  const ids = [...new Set(formData.getAll("memberId").map(String))];
  if (ids.length === 0) return { error: "Nothing to save." };

  const members = await db.member.findMany({
    where: { id: { in: ids }, ...(scope === "ALL" ? {} : { chapterId: scope }) },
    select: { id: true, joinedAt: true, membershipPaidTerms: true },
  });
  const todayKey = istDateKey(new Date());
  const dueDays = await getNumberSetting("membership.dueDaysBefore");

  const updates: { id: string; joinedAt?: Date; membershipPaidTerms: number[]; from: string; to: string }[] = [];
  for (const m of members) {
    const rawJoined = String(formData.get(`joined_${m.id}`) ?? "");
    const oldKey = istDateKey(m.joinedAt);
    let joinedKey = oldKey;
    if (rawJoined) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawJoined);
      if (!match) return { error: `A joining date isn't valid (${rawJoined}).` };
      const d = istToUtc(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (Number(match[1]) < 2000 || istDateKey(d) !== rawJoined) return { error: `A joining date isn't valid (${rawJoined}).` };
      if (rawJoined > todayKey) return { error: "A joining date can't be in the future." };
      joinedKey = rawJoined;
    }
    const firstYear = Number(joinedKey.slice(0, 4));
    const lastYear = termYearAt(joinedKey, addDaysKey(todayKey, dueDays));
    const paid = [...new Set(formData.getAll(`paid_${m.id}`).map(Number))]
      .filter((y) => Number.isInteger(y) && y >= firstYear && y <= lastYear)
      .sort((a, b) => a - b);
    const sameTerms = paid.length === m.membershipPaidTerms.length && paid.every((y, i) => y === [...m.membershipPaidTerms].sort((a, b) => a - b)[i]);
    if (joinedKey === oldKey && sameTerms) continue;
    const parts = joinedKey.split("-").map(Number);
    updates.push({
      id: m.id,
      joinedAt: joinedKey === oldKey ? undefined : istToUtc(parts[0], parts[1] - 1, parts[2]),
      membershipPaidTerms: paid,
      from: oldKey,
      to: joinedKey,
    });
  }

  await db.$transaction(updates.map((u) => db.member.update({ where: { id: u.id }, data: { ...(u.joinedAt ? { joinedAt: u.joinedAt } : {}), membershipPaidTerms: u.membershipPaidTerms } })));
  if (updates.length) {
    await logActivity({
      userId: session.user.id,
      action: "member.membership_bulk_updated",
      entity: "Member",
      metadata: { count: updates.length, memberIds: updates.map((u) => u.id) },
    });
  }
  revalidatePath("/admin/members/membership");
  revalidatePath("/admin/accounts/unpaid");
  return { saved: updates.length };
}

/** How many days before a member's year starts the annual fee falls due. */
export async function saveMembershipDueDays(_prev: { error?: string; saved?: boolean } | undefined, formData: FormData) {
  const scope = await membershipEditScope();
  if (scope !== "ALL") return { error: "Only Super Admin or Accounts can change the due date." };
  const days = Number(formData.get("days"));
  if (!Number.isInteger(days) || days < 0 || days > 365) return { error: "Enter a number of days between 0 and 365." };
  await setNumberSetting("membership.dueDaysBefore", days);
  const session = await requireAdminSession();
  await logActivity({ userId: session.user.id, action: "membership.due_days_changed", entity: "AppSetting", metadata: { days } });
  revalidatePath("/admin/members/membership");
  revalidatePath("/admin/accounts/unpaid");
  revalidatePath("/member/payments");
  return { saved: true };
}
