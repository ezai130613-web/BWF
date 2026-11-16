import Image from "next/image";
import { Download } from "lucide-react";
import { formatShortDate } from "@/components/member/ui";

/**
 * Screenshot-ready banners (2026-10-21 client request) — members screenshot
 * these and post them in the chapter WhatsApp group, so each one stands on
 * its own: logo, who, how much, when. Tall enough for the longest names, never clipped.
 */

type Party = {
  name: string;
  company?: string | null;
  photoUrl?: string | null;
};

function GiverPhoto({ party }: { party: Party }) {
  return party.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin-pasted or R2 URL
    <img
      src={party.photoUrl}
      alt=""
      className="h-24 w-24 rounded-full object-cover ring-4 ring-gold-400/60"
    />
  ) : (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-400/20 font-display text-4xl text-gold-300 ring-4 ring-gold-400/60">
      {party.name.charAt(0)}
    </div>
  );
}

function PartyName({
  party,
  small,
  showName = true,
}: {
  party: Party;
  small?: boolean;
  showName?: boolean;
}) {
  return (
    <span className="block">
      {showName ? (
        <span
          className={`block font-display leading-tight text-ivory-100 ${small ? "text-base" : "text-2xl"}`}
        >
          {party.name}
        </span>
      ) : null}
      {party.company ? (
        <span
          className={
            showName
              ? "mt-0.5 block text-xs text-ivory-200/70"
              : "block text-sm font-medium text-ivory-100"
          }
        >
          {party.company}
        </span>
      ) : null}
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
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-400/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gold-400/5"
        aria-hidden
      />
      <div className="relative flex items-center justify-center gap-2">
        <Image
          src="/images/brand/bwf-logo-512.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="font-display text-sm text-ivory-100">
          Builders World Forum
        </span>
      </div>
      <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-300">
        {eyebrow}
      </p>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-3">
        {children}
      </div>
      <p className="relative border-t border-gold-400/20 pt-3 text-xs text-ivory-200/70">
        {formatShortDate(date)}
        {chapter ? ` · ${chapter}` : ""}
      </p>
    </div>
  );
}

export function BusinessReceivedBanner({
  slipId,
  receiver,
  giver,
  amountInr,
  date,
  chapter,
}: {
  /** Enables the "Download image" link (server-rendered PNG of this same banner). */
  slipId?: string;
  receiver: Party;
  giver: Party;
  amountInr: string;
  date: Date;
  chapter?: string | null;
}) {
  // The slip celebrates the member who GAVE the business: their photo, name
  // and company lead; the receiver only signs off at the bottom.
  return (
    <div className="flex flex-col gap-3">
      <BannerFrame
        eyebrow="Thank you for the business"
        date={date}
        chapter={chapter}
      >
        <GiverPhoto party={giver} />
        <p className="font-display text-xl leading-snug text-ivory-100">
          Big thanks to <span className="text-gold-300">{giver.name}</span> for
          giving me business worth
        </p>
        <span className="font-display text-4xl text-gold-300">{amountInr}</span>
        <PartyName party={giver} showName={false} />
        <div className="mt-2 w-full border-t border-gold-400/20 pt-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ivory-200/60">
            With gratitude
          </p>
          <PartyName party={receiver} small />
        </div>
      </BannerFrame>
      {slipId ? (
        <a
          href={`/api/member/thank-you-slips/${slipId}/image`}
          download
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
        >
          <Download className="h-4 w-4" aria-hidden /> Download as image
        </a>
      ) : null}
    </div>
  );
}

/** Latest few banners up front, the rest behind "Show all" so the page stays short. */
export function ShareBannerGallery({
  items,
  emptyText,
}: {
  items: { key: string; node: React.ReactNode }[];
  emptyText: string;
}) {
  const VISIBLE = 4;
  const grid =
    "grid grid-cols-1 justify-items-center gap-5 md:grid-cols-2 2xl:grid-cols-3";
  if (items.length === 0)
    return <p className="py-2 text-sm text-neutral-500">{emptyText}</p>;
  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className={grid}>
        {items.slice(0, VISIBLE).map((i) => (
          <div key={i.key} className="w-full max-w-sm">
            {i.node}
          </div>
        ))}
      </div>
      {items.length > VISIBLE ? (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-emerald-800 hover:text-emerald-700">
            Show all {items.length} banners
          </summary>
          <div className={`${grid} mt-4`}>
            {items.slice(VISIBLE).map((i) => (
              <div key={i.key} className="w-full max-w-sm">
                {i.node}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
