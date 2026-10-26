import type {
  ChiefGuestsResponse,
  ConclavesResponse,
  ConsumersResponse,
  OneToOnesResponse,
  PowerDatesResponse,
  ReferralsResponse,
  ThankYouSlipsResponse,
} from '@contract';
import type { IconName } from '@/components/ui';
import { formatDate, formatInr } from '@/lib/format';

/**
 * The seven self-reported BWF activities, described once: what the list
 * screen shows and which fields the record form asks for. Field names match
 * the API (and the website's forms) exactly; validation happens server-side.
 */

export type FieldDef =
  | { name: string; label: string; type: 'member'; required?: boolean; hint?: string }
  | { name: string; label: string; type: 'members'; hint?: string }
  | { name: string; label: string; type: 'text' | 'multiline' | 'phone'; required?: boolean; hint?: string }
  | { name: string; label: string; type: 'amount'; required?: boolean; hint?: string }
  | { name: string; label: string; type: 'choice'; options: { value: string; label: string }[]; required?: boolean; hint?: string }
  | { name: string; label: string; type: 'referral'; hint?: string };

export type ListRowData = { key: string; title: string; subtitle?: string | null; meta?: string | null };
export type ListSection = { title: string; rows: ListRowData[]; summary?: string };

export type ActivityKind = {
  key: string;
  title: string;
  recordLabel: string;
  icon: IconName;
  endpoint: string;
  description: string;
  fields: FieldDef[];
  sections: (data: unknown) => ListSection[];
};

const ref = (description: string | null | undefined) => description || null;

export const ACTIVITY_KINDS: ActivityKind[] = [
  {
    key: 'referrals',
    title: 'Referrals',
    recordLabel: 'Give a referral',
    icon: 'git-network-outline',
    endpoint: '/referrals',
    description: 'A genuine business opportunity you pass to a fellow BWF member — Outside (from your own network) or Self/Inside (you bought from them yourself).',
    fields: [
      { name: 'toMemberId', label: 'Referral to', type: 'member', required: true },
      {
        name: 'type',
        label: 'Referral type',
        type: 'choice',
        required: true,
        options: [
          { value: 'OUTSIDE', label: 'Outside' },
          { value: 'SELF', label: 'Self / Inside' },
        ],
      },
      { name: 'description', label: 'Details (optional)', type: 'multiline', hint: 'What the opportunity is — e.g. "Kitchen remodel, Anna Nagar".' },
    ],
    sections: (raw) => {
      const d = raw as ReferralsResponse;
      const row = (r: ReferralsResponse['given'][number], dir: string) => ({
        key: r.id,
        title: `${dir} ${r.other.name}`,
        subtitle: [r.type === 'OUTSIDE' ? 'Outside' : 'Self / Inside', r.other.company, ref(r.description)].filter(Boolean).join(' · '),
        meta: formatDate(r.createdAt),
      });
      return [
        { title: `Given (${d.given.length})`, rows: d.given.map((r) => row(r, 'To')) },
        { title: `Received (${d.received.length})`, rows: d.received.map((r) => row(r, 'From')) },
      ];
    },
  },
  {
    key: 'thank-you-slips',
    title: 'Thank You Slips',
    recordLabel: 'Add a Thank You Slip',
    icon: 'receipt-outline',
    endpoint: '/thank-you-slips',
    description: 'Business you actually received through a BWF referral. Referral = opportunity given; Thank You Slip = business successfully generated.',
    fields: [
      { name: 'toMemberId', label: 'Thank (the member who gave you the business)', type: 'member', required: true },
      { name: 'amountInr', label: 'Business value (₹)', type: 'amount', required: true },
      { name: 'referralId', label: 'For which referral? (optional)', type: 'referral' },
      { name: 'description', label: 'Details (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as ThankYouSlipsResponse;
      const row = (s: ThankYouSlipsResponse['given'][number], dir: string) => ({
        key: s.id,
        title: `${formatInr(s.amountInr)} · ${dir} ${s.other.name}`,
        subtitle: [s.other.company, ref(s.description)].filter(Boolean).join(' · '),
        meta: formatDate(s.createdAt),
      });
      return [
        { title: `Business received (${d.given.length})`, summary: `Total ${formatInr(d.totalGivenInr)}`, rows: d.given.map((s) => row(s, 'thanked')) },
        { title: `Business given (${d.received.length})`, summary: `Total ${formatInr(d.totalReceivedInr)}`, rows: d.received.map((s) => row(s, 'from')) },
      ];
    },
  },
  {
    key: 'one-to-ones',
    title: 'One-to-Ones',
    recordLabel: 'Record a 1-to-1',
    icon: 'people-outline',
    endpoint: '/one-to-ones',
    description: 'A one-to-one meeting with a fellow member to understand each other’s business.',
    fields: [
      { name: 'withMemberId', label: 'Met with', type: 'member', required: true },
      { name: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as OneToOnesResponse;
      return [
        {
          title: `All (${d.items.length})`,
          rows: d.items.map((o) => ({
            key: o.id,
            title: `With ${o.with.name}`,
            subtitle: [o.with.company, o.notes, o.recordedByMe ? null : 'Recorded by them'].filter(Boolean).join(' · '),
            meta: formatDate(o.metAt),
          })),
        },
      ];
    },
  },
  {
    key: 'power-dates',
    title: 'Power Dates',
    recordLabel: 'Add a Power Date',
    icon: 'rocket-outline',
    endpoint: '/power-dates',
    description: 'You took a fellow member to meet one of your own contacts.',
    fields: [
      { name: 'participantMemberId', label: 'Fellow member', type: 'member', required: true },
      { name: 'externalContactName', label: 'Introduced to (name)', type: 'text', required: true },
      { name: 'externalContactCompany', label: 'Their company (optional)', type: 'text' },
      { name: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as PowerDatesResponse;
      return [
        {
          title: `All (${d.items.length})`,
          rows: d.items.map((p) => ({
            key: p.id,
            title: `${p.participant.name} → ${p.externalContactName}`,
            subtitle: [p.externalContactCompany, p.notes].filter(Boolean).join(' · '),
            meta: formatDate(p.metAt),
          })),
        },
      ];
    },
  },
  {
    key: 'conclaves',
    title: 'Conclaves',
    recordLabel: 'Record a Conclave',
    icon: 'git-merge-outline',
    endpoint: '/conclaves',
    description: 'Three or more BWF members meeting together — you plus at least two others.',
    fields: [
      { name: 'participantMemberIds', label: 'Fellow members (at least 2)', type: 'members' },
      { name: 'location', label: 'Where (optional)', type: 'text' },
      { name: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as ConclavesResponse;
      return [
        {
          title: `All (${d.items.length})`,
          rows: d.items.map((c) => ({
            key: c.id,
            title: [c.organizer, ...c.participants].join(', '),
            subtitle: [c.location, c.organizedByMe ? 'Organised by you' : `Organised by ${c.organizer}`].filter(Boolean).join(' · '),
            meta: formatDate(c.metAt),
          })),
        },
      ];
    },
  },
  {
    key: 'consumers',
    title: 'Consumers Brought',
    recordLabel: 'Add a consumer',
    icon: 'home-outline',
    endpoint: '/consumers',
    description: 'An end consumer with a real construction requirement you brought to a meeting.',
    fields: [
      { name: 'name', label: 'Consumer name', type: 'text', required: true },
      { name: 'company', label: 'Company (optional)', type: 'text' },
      { name: 'phone', label: 'Phone (optional)', type: 'phone' },
      { name: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as ConsumersResponse;
      return [
        {
          title: `All (${d.items.length})`,
          rows: d.items.map((c) => ({ key: c.id, title: c.name, subtitle: [c.company, c.phone, c.notes].filter(Boolean).join(' · '), meta: formatDate(c.metAt) })),
        },
      ];
    },
  },
  {
    key: 'chief-guests',
    title: 'Chief Guests Brought',
    recordLabel: 'Add a Chief Guest',
    icon: 'ribbon-outline',
    endpoint: '/chief-guests',
    description: 'A Chief Guest you invited to a chapter meeting.',
    fields: [
      { name: 'name', label: 'Chief Guest name', type: 'text', required: true },
      { name: 'designation', label: 'Designation (optional)', type: 'text' },
      { name: 'company', label: 'Company (optional)', type: 'text' },
      { name: 'notes', label: 'Notes (optional)', type: 'multiline' },
    ],
    sections: (raw) => {
      const d = raw as ChiefGuestsResponse;
      return [
        {
          title: `All (${d.items.length})`,
          rows: d.items.map((g) => ({ key: g.id, title: g.name, subtitle: [g.designation, g.company, g.notes].filter(Boolean).join(' · '), meta: formatDate(g.metAt) })),
        },
      ];
    },
  },
];

export function findActivityKind(key: string | undefined) {
  return ACTIVITY_KINDS.find((k) => k.key === key);
}
