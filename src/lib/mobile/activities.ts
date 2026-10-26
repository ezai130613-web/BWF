import { db } from "@/lib/db";
import type { Actor, RecordResult } from "@/lib/member-activities/record";
import { rateLimit, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";
import { invalid, json, MobileApiError, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type {
  ChiefGuestsResponse,
  ConclavesResponse,
  ConsumersResponse,
  OneToOnesResponse,
  PowerDatesResponse,
  ReferralsResponse,
  ThankYouSlipsResponse,
} from "@/lib/mobile/contract";

/** POST handler for one of src/lib/member-activities/record.ts's recorders. */
export function recordRoute(recorder: (actor: Actor, input: unknown) => Promise<RecordResult>) {
  return mobileHandler(async (request: Request) => {
    const { user, member } = await requireMobileMember(request);
    // Generous for real use; stops a runaway client inflating someone's score.
    if (!(await rateLimit(`mobile-record:${user.id}`, { limit: 60, windowSeconds: 600 }))) {
      throw new MobileApiError(429, "RATE_LIMITED", TOO_MANY_REQUESTS_ERROR);
    }
    const body = await request.json().catch(() => null);
    const result = await recorder({ userId: user.id, memberId: member.id }, body);
    if (!result.ok) throw invalid(result.error);
    return json({ ok: true, id: result.id }, 201);
  });
}


const personSelect = { select: { name: true, company: { select: { name: true } } } } as const;
const person = (m: { name: string; company: { name: string } }) => ({ name: m.name, company: m.company.name });

export async function listReferrals(memberId: string): Promise<ReferralsResponse> {
  const [given, received] = await Promise.all([
    db.referral.findMany({ where: { fromMemberId: memberId }, include: { toMember: personSelect }, orderBy: { createdAt: "desc" } }),
    db.referral.findMany({ where: { toMemberId: memberId }, include: { fromMember: personSelect }, orderBy: { createdAt: "desc" } }),
  ]);
  const row = (r: (typeof given)[number] | (typeof received)[number], other: { name: string; company: { name: string } }) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    other: person(other),
  });
  return { given: given.map((r) => row(r, r.toMember)), received: received.map((r) => row(r, r.fromMember)) };
}

export async function listThankYouSlips(memberId: string): Promise<ThankYouSlipsResponse> {
  const [given, received, referrals] = await Promise.all([
    db.thankYouSlip.findMany({ where: { fromMemberId: memberId }, include: { toMember: personSelect }, orderBy: { createdAt: "desc" } }),
    db.thankYouSlip.findMany({ where: { toMemberId: memberId }, include: { fromMember: personSelect }, orderBy: { createdAt: "desc" } }),
    db.referral.findMany({
      where: { toMemberId: memberId },
      include: { fromMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const row = (s: (typeof given)[number] | (typeof received)[number], other: { name: string; company: { name: string } }) => ({
    id: s.id,
    amountInr: s.amountInr,
    description: s.description,
    createdAt: s.createdAt.toISOString(),
    other: person(other),
  });
  return {
    given: given.map((s) => row(s, s.toMember)),
    received: received.map((s) => row(s, s.fromMember)),
    totalGivenInr: given.reduce((sum, s) => sum + s.amountInr, 0),
    totalReceivedInr: received.reduce((sum, s) => sum + s.amountInr, 0),
    linkableReferrals: referrals.map((r) => ({ id: r.id, fromMemberName: r.fromMember.name, createdAt: r.createdAt.toISOString() })),
  };
}

export async function listOneToOnes(memberId: string): Promise<OneToOnesResponse> {
  const items = await db.oneToOne.findMany({
    where: { OR: [{ memberId }, { withMemberId: memberId }] },
    include: { member: personSelect, withMember: personSelect },
    orderBy: { metAt: "desc" },
  });
  return {
    items: items.map((o) => ({
      id: o.id,
      notes: o.notes,
      metAt: o.metAt.toISOString(),
      recordedByMe: o.memberId === memberId,
      with: person(o.memberId === memberId ? o.withMember : o.member),
    })),
  };
}

export async function listPowerDates(memberId: string): Promise<PowerDatesResponse> {
  const items = await db.powerDate.findMany({
    where: { hostMemberId: memberId },
    include: { participantMember: personSelect },
    orderBy: { metAt: "desc" },
  });
  return {
    items: items.map((p) => ({
      id: p.id,
      externalContactName: p.externalContactName,
      externalContactCompany: p.externalContactCompany,
      notes: p.notes,
      metAt: p.metAt.toISOString(),
      participant: person(p.participantMember),
    })),
  };
}

export async function listConclaves(memberId: string): Promise<ConclavesResponse> {
  const items = await db.conclave.findMany({
    where: { OR: [{ organizedByMemberId: memberId }, { participants: { some: { memberId } } }] },
    include: { organizedByMember: { select: { name: true } }, participants: { include: { member: { select: { name: true } } } } },
    orderBy: { metAt: "desc" },
  });
  return {
    items: items.map((c) => ({
      id: c.id,
      location: c.location,
      notes: c.notes,
      metAt: c.metAt.toISOString(),
      organizer: c.organizedByMember.name,
      participants: c.participants.map((p) => p.member.name),
      organizedByMe: c.organizedByMemberId === memberId,
    })),
  };
}

export async function listConsumers(memberId: string): Promise<ConsumersResponse> {
  const items = await db.consumer.findMany({ where: { memberId }, orderBy: { metAt: "desc" } });
  return {
    items: items.map((c) => ({ id: c.id, name: c.name, company: c.company, phone: c.phone, notes: c.notes, metAt: c.metAt.toISOString() })),
  };
}

export async function listChiefGuests(memberId: string): Promise<ChiefGuestsResponse> {
  const items = await db.memberChiefGuest.findMany({ where: { memberId }, orderBy: { metAt: "desc" } });
  return {
    items: items.map((g) => ({
      id: g.id,
      name: g.name,
      company: g.company,
      designation: g.designation,
      notes: g.notes,
      metAt: g.metAt.toISOString(),
    })),
  };
}

/** GET handler returning one of the list*() loaders above for the signed-in member. */
export function listRoute<T>(loader: (memberId: string) => Promise<T>) {
  return mobileHandler(async (request: Request) => {
    const { member } = await requireMobileMember(request);
    return json(await loader(member.id));
  });
}
