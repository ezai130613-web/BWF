import { Handshake, Megaphone } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getPickerMembers } from "@/lib/members/picker";
import { referralContact } from "@/lib/member-activities/record";
import { RecordReferralForm } from "@/components/member/record-referral-form";
import { Card, DataTable, PageHeader, formatShortDate, tdClass } from "@/components/member/ui";
import { ReferralGivenBanner, ShareBannerGallery } from "@/components/member/share-banner";

const TYPE_LABEL: Record<string, string> = {
  OUTSIDE: "Outside",
  SELF: "Self / Inside",
};

export default async function MemberReferralsPage() {
  const { member } = await requireMemberProfile();

  const [me, given, received, members] = await Promise.all([
    db.member.findUniqueOrThrow({ where: { id: member.id }, select: { name: true, company: { select: { name: true } }, chapter: { select: { name: true } } } }),
    db.referral.findMany({
      where: { fromMemberId: member.id },
      include: { toMember: { select: { name: true, company: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.referral.findMany({
      where: { toMemberId: member.id },
      include: { fromMember: { select: { name: true, company: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    getPickerMembers(member.id),
  ]);

  const self = { name: me.name, company: me.company.name };
  const banners = [
    ...given.map((r) => ({ referral: r, giver: self, receiver: { name: r.toMember.name, company: r.toMember.company.name } })),
    ...received.map((r) => ({ referral: r, giver: { name: r.fromMember.name, company: r.fromMember.company.name }, receiver: self })),
  ]
    .sort((a, b) => b.referral.createdAt.getTime() - a.referral.createdAt.getTime())
    .map(({ referral, giver, receiver }) => ({
      key: referral.id,
      node: (
        <ReferralGivenBanner
          giver={giver}
          receiver={receiver}
          typeLabel={`${TYPE_LABEL[referral.type]} referral`}
          date={referral.createdAt}
          chapter={me.chapter.name}
        />
      ),
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Handshake}
        title="Referrals"
        description="A genuine business opportunity you pass to a fellow BWF member — Outside (from your own network) or Self/Inside (you bought from them yourself)."
      />
      <Card
        title="Share on WhatsApp"
        icon={Megaphone}
        description="Take a screenshot of a banner and post it in your chapter WhatsApp group."
        bodyClassName="px-5 pt-5 sm:px-6"
      >
        <ShareBannerGallery items={banners} emptyText="Banners appear here once a referral is recorded." />
      </Card>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <RecordReferralForm members={members} />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card title={`Given (${given.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["To", "Type", "Date"]} empty={given.length === 0 ? "No referrals given yet." : null}>
              {given.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>
                    {r.toMember.name}
                    <ReferralDetails referral={r} />
                  </td>
                  <td className={`${tdClass} text-neutral-600`}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title={`Received (${received.length})`} bodyClassName="px-5 pb-1 pt-0 sm:px-6">
            <DataTable head={["From", "Type", "Date"]} empty={received.length === 0 ? "No referrals received yet." : null}>
              {received.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} font-medium text-neutral-900`}>
                    {r.fromMember.name}
                    <ReferralDetails referral={r} />
                  </td>
                  <td className={`${tdClass} text-neutral-600`}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500`}>{formatShortDate(r.createdAt)}</td>
                </tr>
              ))}
            </DataTable>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The referred contact (tap-to-call) and description under the member's name. */
function ReferralDetails({
  referral,
}: {
  referral: { contactName: string | null; contactPhone: string | null; description: string | null };
}) {
  const contact = referralContact(referral);
  if (!contact && !referral.description) return null;
  return (
    <span className="mt-1 block text-xs font-normal text-neutral-600">
      {contact ? (
        <span className="block">
          Contact: {referral.contactName}
          {referral.contactName && referral.contactPhone ? ", " : null}
          {referral.contactPhone ? (
            <a href={`tel:${referral.contactPhone.replace(/[^\d+]/g, "")}`} className="text-emerald-800 underline">
              {referral.contactPhone}
            </a>
          ) : null}
        </span>
      ) : null}
      {referral.description ? <span className="block whitespace-pre-line">{referral.description}</span> : null}
    </span>
  );
}
