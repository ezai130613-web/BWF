import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { fellowMemberScope } from "@/lib/members/visibility";

/**
 * Recording the member's self-reported BWF App activities (Phase 18/20) —
 * shared by the portal's Server Actions and the mobile API (Phase 33), so
 * the rules (no recording against yourself, a linked referral must be one
 * you received, a Conclave needs 2+ fellow members, …) exist exactly once.
 *
 * Each recorder takes the acting member/login and an untrusted plain object
 * (Object.fromEntries(formData) on the web, a JSON body from the app).
 */

export type Actor = { userId: string; memberId: string };
export type RecordResult = { ok: true; id: string } | { ok: false; error: string };

const optionalText = () => z.string().max(5000).optional().transform((v) => v?.trim() || undefined);
const fail = (error: string): RecordResult => ({ ok: false, error });

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}

/**
 * The other member(s) must be real, active members the actor is allowed to
 * pick (fellowMemberScope) — a stale or forged id otherwise surfaces as a
 * foreign-key 500, or lets a demo account touch real members.
 */
async function allPickableMembers(actor: Actor, ids: string[]) {
  const count = await db.member.count({
    where: { AND: [{ id: { in: ids }, status: "ACTIVE" }, await fellowMemberScope(actor.memberId)] },
  });
  return count === new Set(ids).size;
}
const UNKNOWN_MEMBER = "That member couldn't be found. Refresh the list and pick again.";

const referralSchema = z.object({
  toMemberId: z.string().min(1, "Select a member"),
  type: z.enum(["OUTSIDE", "SELF"], "Choose the referral type"),
  contactName: z.string().max(200).optional().transform((v) => v?.trim() || undefined),
  contactPhone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine((v) => !v || /^[+\d][\d\s()-]{5,}$/.test(v), "Enter a valid contact number"),
  description: optionalText(),
});

/** "Ravi Kumar, 98765 43210" — the referral's contact, or null if none was given. */
export function referralContact(r: { contactName: string | null; contactPhone: string | null }): string | null {
  return [r.contactName, r.contactPhone].filter(Boolean).join(", ") || null;
}

export async function recordReferral(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = referralSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (parsed.data.toMemberId === actor.memberId) return fail("You can't record a referral to yourself.");
  if (!(await allPickableMembers(actor, [parsed.data.toMemberId]))) return fail(UNKNOWN_MEMBER);

  const referral = await db.referral.create({ data: { ...parsed.data, fromMemberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "referral.recorded",
    entity: "Referral",
    entityId: referral.id,
    metadata: { fromMemberId: actor.memberId, toMemberId: parsed.data.toMemberId },
  });
  return { ok: true, id: referral.id };
}

const thankYouSlipSchema = z.object({
  toMemberId: z.string().min(1, "Select a member"),
  amountInr: z.coerce.number().int("Enter a whole rupee amount").positive("Enter a real amount").max(1_000_000_000),
  description: optionalText(),
  referralId: optionalText(),
});

export async function recordThankYouSlip(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = thankYouSlipSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (parsed.data.toMemberId === actor.memberId) return fail("You can't record a Thank You Slip to yourself.");
  if (!(await allPickableMembers(actor, [parsed.data.toMemberId]))) return fail(UNKNOWN_MEMBER);

  // A linked referral, if any, must actually be one this member received —
  // otherwise they'd be thanking someone for a referral that isn't theirs.
  if (parsed.data.referralId) {
    const referral = await db.referral.findUnique({ where: { id: parsed.data.referralId } });
    if (!referral || referral.toMemberId !== actor.memberId) return fail("That referral isn't one you received.");
  }

  const slip = await db.thankYouSlip.create({ data: { ...parsed.data, fromMemberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "thank_you_slip.recorded",
    entity: "ThankYouSlip",
    entityId: slip.id,
    metadata: { fromMemberId: actor.memberId, toMemberId: parsed.data.toMemberId, amountInr: parsed.data.amountInr },
  });
  return { ok: true, id: slip.id };
}

const oneToOneSchema = z.object({
  withMemberId: z.string().min(1, "Select a member"),
  notes: optionalText(),
});

export async function recordOneToOne(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = oneToOneSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (parsed.data.withMemberId === actor.memberId) return fail("You can't record a One-to-One with yourself.");
  if (!(await allPickableMembers(actor, [parsed.data.withMemberId]))) return fail(UNKNOWN_MEMBER);

  const oneToOne = await db.oneToOne.create({ data: { ...parsed.data, memberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "one_to_one.recorded",
    entity: "OneToOne",
    entityId: oneToOne.id,
    metadata: { memberId: actor.memberId, withMemberId: parsed.data.withMemberId },
  });
  return { ok: true, id: oneToOne.id };
}

const powerDateSchema = z.object({
  participantMemberId: z.string().min(1, "Select a fellow member"),
  externalContactName: z.string().trim().min(1, "Enter who you introduced them to").max(200),
  externalContactCompany: optionalText(),
  notes: optionalText(),
});

export async function recordPowerDate(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = powerDateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (parsed.data.participantMemberId === actor.memberId) {
    return fail("You can't record a Power Date with yourself as the fellow member.");
  }
  if (!(await allPickableMembers(actor, [parsed.data.participantMemberId]))) return fail(UNKNOWN_MEMBER);

  const powerDate = await db.powerDate.create({ data: { ...parsed.data, hostMemberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "power_date.recorded",
    entity: "PowerDate",
    entityId: powerDate.id,
    metadata: { hostMemberId: actor.memberId, participantMemberId: parsed.data.participantMemberId },
  });
  return { ok: true, id: powerDate.id };
}

const conclaveSchema = z.object({
  location: optionalText(),
  notes: optionalText(),
  participantMemberIds: z.array(z.string().min(1)).max(200).default([]),
});

export async function recordConclave(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = conclaveSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const participantIds = [...new Set(parsed.data.participantMemberIds)].filter((id) => id !== actor.memberId);
  // A Conclave is 3+ BWF members — the organizer plus at least 2 others.
  if (participantIds.length < 2) {
    return fail("Select at least 2 fellow members — a Conclave is 3 or more members together.");
  }
  if (!(await allPickableMembers(actor, participantIds))) return fail(UNKNOWN_MEMBER);

  const conclave = await db.conclave.create({
    data: {
      location: parsed.data.location,
      notes: parsed.data.notes,
      organizedByMemberId: actor.memberId,
      participants: { create: participantIds.map((memberId) => ({ memberId })) },
    },
  });
  await logActivity({
    userId: actor.userId,
    action: "conclave.recorded",
    entity: "Conclave",
    entityId: conclave.id,
    metadata: { organizedByMemberId: actor.memberId, participantIds },
  });
  return { ok: true, id: conclave.id };
}

const consumerSchema = z.object({
  name: z.string().trim().min(1, "Enter the consumer's name").max(200),
  company: optionalText(),
  phone: optionalText(),
  notes: optionalText(),
});

/**
 * Phase 20 Batch 5 — a member self-reports bringing an end consumer (real
 * construction requirement, not a prospective member) to a meeting. No link
 * to the public Visitor model.
 */
export async function recordConsumer(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = consumerSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const consumer = await db.consumer.create({ data: { ...parsed.data, memberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "consumer.recorded",
    entity: "Consumer",
    entityId: consumer.id,
    metadata: { memberId: actor.memberId },
  });
  return { ok: true, id: consumer.id };
}

const chiefGuestSchema = z.object({
  name: z.string().trim().min(1, "Enter the Chief Guest's name").max(200),
  company: optionalText(),
  designation: optionalText(),
  notes: optionalText(),
});

/**
 * Phase 20 Batch 5 — a member self-reports inviting a Chief Guest to a
 * meeting. Deliberately separate from the public ChiefGuest homepage
 * showcase (`/admin/chief-guests`): this is the member's own private
 * activity credit, not curated public social proof.
 */
export async function recordChiefGuest(actor: Actor, input: unknown): Promise<RecordResult> {
  const parsed = chiefGuestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const guest = await db.memberChiefGuest.create({ data: { ...parsed.data, memberId: actor.memberId } });
  await logActivity({
    userId: actor.userId,
    action: "member_chief_guest.recorded",
    entity: "MemberChiefGuest",
    entityId: guest.id,
    metadata: { memberId: actor.memberId },
  });
  return { ok: true, id: guest.id };
}
