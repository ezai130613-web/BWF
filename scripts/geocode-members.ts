/**
 * One-off backfill (2026-10-03): give existing members coordinates for the
 * member-portal radius search by geocoding their saved `address` with the
 * Google Geocoding API. Only touches ACTIVE members that have an address
 * and no coordinates yet; never overwrites a location an admin picked.
 *
 *   npx tsx scripts/geocode-members.ts            # dry run — prints results
 *   npx tsx scripts/geocode-members.ts --apply    # writes latitude/longitude/locationLabel
 *
 * Needs GOOGLE_MAPS_SERVER_API_KEY (Geocoding API enabled; server key, not
 * referrer-restricted) — falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 * Results are biased to India; anything Google marks only APPROXIMATE at
 * country/state level is reported and skipped rather than saved.
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const key = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const apply = process.argv.includes("--apply");

type GeocodeResponse = {
  status: string;
  results: { formatted_address: string; geometry: { location: { lat: number; lng: number }; location_type: string }; types: string[] }[];
};

async function main() {
  if (!key) throw new Error("Set GOOGLE_MAPS_SERVER_API_KEY (or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) first.");

  const members = await db.member.findMany({
    where: { status: "ACTIVE", address: { not: null }, latitude: null },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });
  console.log(`${members.length} member(s) to geocode${apply ? "" : " (dry run)"}`);

  let saved = 0;
  for (const m of members) {
    const address = m.address!.trim();
    if (!address) continue;
    const query = /chennai|tamil nadu|india/i.test(address) ? address : `${address}, Chennai, Tamil Nadu`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({ address: query, region: "in", components: "country:IN", key })}`;
    const data = (await (await fetch(url)).json()) as GeocodeResponse;
    const top = data.results?.[0];
    const tooVague = top?.types.some((t) => ["country", "administrative_area_level_1"].includes(t));
    if (data.status !== "OK" || !top || tooVague) {
      console.log(`  SKIP  ${m.name} — "${address}" → ${data.status}${tooVague ? " (too vague)" : ""}`);
      continue;
    }
    const { lat, lng } = top.geometry.location;
    console.log(`  OK    ${m.name} — ${top.formatted_address} (${lat.toFixed(5)}, ${lng.toFixed(5)}, ${top.geometry.location_type})`);
    if (apply) {
      await db.member.update({ where: { id: m.id }, data: { latitude: lat, longitude: lng, locationLabel: top.formatted_address } });
      saved += 1;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  console.log(apply ? `Saved ${saved}.` : "Dry run only — re-run with --apply to save.");
}

main().finally(() => db.$disconnect());
