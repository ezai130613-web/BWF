import Image from "next/image";
import { formatShortDate } from "@/components/member/ui";

/**
 * Screenshot-ready banners (2026-10-21 client request) — members screenshot
 * these and post them in the chapter WhatsApp group, so each one stands on
 * its own: logo, who, how much, when. Tall enough for the longest names, never clipped.
 */

type Party = { name: string; company?: string | null };

function PartyName({ party }: { party: Party }) {
  return (
    <span className="block">
      <span className="block font-display text-2xl leading-tight text-ivory-100">{party.name}</span>
      {party.company ? <span className="mt-0.5 block text-xs text-ivory-200/70">{party.company}</span> : null}
    </span>
  );
}

function BannerFrame({
  eyebrow,
  date,
  chapter,
  children,
}: {
  eyebrow: string;
  date: Date;
  chapter?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[30rem] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-center shadow-lg ring-1 ring-gold-400/30">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-400/10" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gold-400/5" aria-hidden />
      <div className="relative flex items-center justify-center gap-2">
        <Image src="/images/brand/bwf-logo-512.png" alt="" width={32} height={32} className="h-8 w-8" />
        <span className="font-display text-sm text-ivory-100">Builders World Forum</span>
      </div>
      <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">{eyebrow}</p>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3">{children}</div>
      <p className="relative border-t border-gold-400/20 pt-3 text-xs text-ivory-200/70">
        {formatShortDate(date)}
        {chapter ? ` · ${chapter}` : ""}
      </p>
    </div>
  );
}

export function BusinessReceivedBanner({
  receiver,
  giver,
  amountInr,
  date,
  chapter,
}: {
  receiver: Party;
  giver: Party;
  amountInr: string;
  date: Date;
  chapter?: string | null;
}) {
  return (
    <BannerFrame eyebrow="Thank you for the business" date={date} chapter={chapter}>
      <PartyName party={receiver} />
      <span className="text-sm text-ivory-200/80">received business worth</span>
      <span className="font-display text-4xl text-gold-300">{amountInr}</span>
      <span className="text-sm text-ivory-200/80">from</span>
      <PartyName party={giver} />
    </BannerFrame>
  );
}

export function ReferralGivenBanner({
  giver,
  receiver,
  typeLabel,
  date,
  chapter,
}: {
  giver: Party;
  receiver: Party;
  typeLabel: string;
  date: Date;
  chapter?: string | null;
}) {
  return (
    <BannerFrame eyebrow="Referral given" date={date} chapter={chapter}>
      <PartyName party={giver} />
      <span className="text-sm text-ivory-200/80">passed a business referral to</span>
      <PartyName party={receiver} />
      <span className="rounded-full border border-gold-400/40 px-3 py-1 text-xs font-medium text-gold-300">{typeLabel}</span>
    </BannerFrame>
  );
}

/** Latest few banners up front, the rest behind "Show all" so the page stays short. */
export function ShareBannerGallery({ items, emptyText }: { items: { key: string; node: React.ReactNode }[]; emptyText: string }) {
  const VISIBLE = 4;
  const grid = "grid grid-cols-1 justify-items-center gap-5 md:grid-cols-2 2xl:grid-cols-3";
  if (items.length === 0) return <p className="py-2 text-sm text-neutral-500">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className={grid}>
        {items.slice(0, VISIBLE).map((i) => (
          <div key={i.key} className="w-full max-w-sm">{i.node}</div>
        ))}
      </div>
      {items.length > VISIBLE ? (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-emerald-800 hover:text-emerald-700">
            Show all {items.length} banners
          </summary>
          <div className={`${grid} mt-4`}>
            {items.slice(VISIBLE).map((i) => (
              <div key={i.key} className="w-full max-w-sm">{i.node}</div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
