import { RADIUS_OPTIONS } from "@/lib/geo";
import { memberLocality, searchNearbyMembers } from "@/lib/members/nearby-search";
import { memberProfileUrl } from "@/lib/mobile/account";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { NearbySearchResponse } from "@/lib/mobile/contract";

const MAX_RESULTS = 100;

/**
 * Find Members Nearby. Query: lat, lng (the phone's location or a chosen
 * place), radius (km), q (name/company), place (text fallback), chapter,
 * category — same semantics as /member/search.
 */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const p = new URL(request.url).searchParams;
  const get = (key: string) => p.get(key) ?? undefined;

  const result = await searchNearbyMembers(member.id, {
    q: get("q"),
    place: get("place"),
    chapterId: get("chapter"),
    categoryId: get("category"),
    radius: get("radius"),
    lat: get("lat"),
    lng: get("lng"),
  });

  const body: NearbySearchResponse = {
    mode: result.mode,
    radiusKm: result.radius,
    radiusOptions: RADIUS_OPTIONS,
    total: result.results.length,
    withoutLocation: result.withoutLocation,
    members: result.results.slice(0, MAX_RESULTS).map((m) => ({
      id: m.id,
      name: m.name,
      photoUrl: m.photoUrl,
      company: m.company.name,
      chapter: m.chapter.name,
      category: m.category.name,
      locality: memberLocality(m) || null,
      phone: m.phone,
      whatsapp: m.whatsapp,
      latitude: m.latitude,
      longitude: m.longitude,
      distanceKm: m.distance,
      profileUrl: memberProfileUrl(m.slug),
    })),
    chapters: result.chapters,
    categories: result.categories,
  };
  return json(body);
});
