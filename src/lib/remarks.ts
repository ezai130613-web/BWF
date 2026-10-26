import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import type { AdminRemarkContext, Prisma } from "@/generated/prisma/client";

/**
 * Admin-only remarks (2026-10-26) — recorded when approving a membership or a
 * renewal, or added any time from the member's page. Append-only; see the
 * AdminRemark model comment. Nothing in the member portal reads these.
 */

export const REMARK_CONTEXT_LABELS: Record<AdminRemarkContext, string> = {
  MEMBERSHIP_APPROVAL: "Membership approval",
  RENEWAL: "Renewal",
  GENERAL: "General",
};

export const REMARK_MAX_LENGTH = 2000;

export type AdminRemarkView = {
  id: string;
  context: AdminRemarkContext;
  body: string;
  authorName: string;
  createdAt: Date;
  /** e.g. "Annual membership 2026 payment" — what the remark was recorded against. */
  source: string | null;
};

const remarkInclude = {
  payment: { select: { type: true, membershipYear: true } },
  application: { select: { id: true } },
} satisfies Prisma.AdminRemarkInclude;

function toView(remark: Prisma.AdminRemarkGetPayload<{ include: typeof remarkInclude }>): AdminRemarkView {
  let source: string | null = null;
  if (remark.payment) {
    source =
      remark.payment.type === "MEMBERSHIP"
        ? `Annual membership${remark.payment.membershipYear ? ` ${remark.payment.membershipYear}` : ""} payment`
        : "Meeting fee payment";
  } else if (remark.application) {
    source = "Membership application";
  }
  return {
    id: remark.id,
    context: remark.context,
    body: remark.body,
    authorName: remark.authorName,
    createdAt: remark.createdAt,
    source,
  };
}

/**
 * Saves one remark. A blank body is a no-op (every remark box is optional),
 * so callers can pass the raw form value straight through.
 */
export async function addAdminRemark(input: {
  userId: string;
  context: AdminRemarkContext;
  body: string | null | undefined;
  memberId?: string | null;
  applicationId?: string | null;
  paymentId?: string | null;
}) {
  const body = (input.body ?? "").trim().slice(0, REMARK_MAX_LENGTH);
  if (!body) return null;

  const author = await db.user.findUnique({ where: { id: input.userId }, select: { name: true } });

  const remark = await db.adminRemark.create({
    data: {
      context: input.context,
      body,
      memberId: input.memberId ?? null,
      applicationId: input.applicationId ?? null,
      paymentId: input.paymentId ?? null,
      authorUserId: input.userId,
      authorName: author?.name ?? "Admin",
    },
  });

  await logActivity({
    userId: input.userId,
    action: "remark.added",
    entity: "AdminRemark",
    entityId: remark.id,
    metadata: { context: input.context, memberId: input.memberId, applicationId: input.applicationId, paymentId: input.paymentId },
  });

  return remark;
}

/**
 * Every remark about a member, newest first — including ones recorded on the
 * application they were converted from (covers remarks made before the
 * conversion stamped memberId, and any application that was converted
 * before this feature existed).
 */
export async function getMemberRemarks(memberId: string): Promise<AdminRemarkView[]> {
  const remarks = await db.adminRemark.findMany({
    where: { OR: [{ memberId }, { application: { convertedMemberId: memberId } }] },
    include: remarkInclude,
    orderBy: { createdAt: "desc" },
  });
  return remarks.map(toView);
}

/** Remarks for an application, plus the converted member's later remarks once it has one. */
export async function getApplicationRemarks(applicationId: string, convertedMemberId: string | null): Promise<AdminRemarkView[]> {
  const remarks = await db.adminRemark.findMany({
    where: { OR: [{ applicationId }, ...(convertedMemberId ? [{ memberId: convertedMemberId }] : [])] },
    include: remarkInclude,
    orderBy: { createdAt: "desc" },
  });
  return remarks.map(toView);
}

/** Batched version of getMemberRemarks for list pages, keyed by member id. */
export async function getRemarksForMembers(memberIds: string[]): Promise<Map<string, AdminRemarkView[]>> {
  const byMember = new Map<string, AdminRemarkView[]>();
  if (memberIds.length === 0) return byMember;

  const remarks = await db.adminRemark.findMany({
    where: { OR: [{ memberId: { in: memberIds } }, { application: { convertedMemberId: { in: memberIds } } }] },
    include: { ...remarkInclude, application: { select: { id: true, convertedMemberId: true } } },
    orderBy: { createdAt: "desc" },
  });
  for (const remark of remarks) {
    const memberId = remark.memberId ?? remark.application?.convertedMemberId;
    if (!memberId) continue;
    const list = byMember.get(memberId) ?? [];
    list.push(toView(remark));
    byMember.set(memberId, list);
  }
  return byMember;
}
