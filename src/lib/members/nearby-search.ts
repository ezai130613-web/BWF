import { db } from "@/lib/db";
import { fellowMemberScope } from "@/lib/members/visibility";
import { RADIUS_OPTIONS, distanceKm, isValidLatLng } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Find Members Nearby (Phase 30) — shared by /member/search and the mobile
 * API (Phase 34). With coordinates (a Google Places selection on the web,
 * the phone's own location or a place in the app) it's a real radius search;
 * without, it falls back to matching the typed place against saved
 * addresses.
 */

export const DEFAULT_RADIUS_KM = 5;

export const nearbyMemberSelect = {
  id: true,
  slug: true,
  name: true,
  photoUrl: true,
  phone: true,
  whatsapp: true,
  address: true,
  areasServed: true,
  locationLabel: true,
  latitude: true,
  longitude: true,
  company: { select: { name: true } },
  chapter: { select: { name: true } },
  category: { select: { name: true } },
} satisfies Prisma.MemberSelect;

export type NearbyResultMember = Prisma.MemberGetPayload<{ select: typeof nearbyMemberSelect }> & { distance: number | null };

export type NearbySearchInput = {
  q?: string;
  place?: string;
  chapterId?: string;
  categoryId?: string;
  radius?: string | number;
  lat?: string;
  lng?: string;
};

/** "Arumbakkam, Chennai, Tamil Nadu, India" → "Arumbakkam, Chennai" */
export function memberLocality(m: Pick<NearbyResultMember, "locationLabel" | "address">) {
  const source = m.locationLabel ?? m.address ?? "";
  return source.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2).join(", ");
}

export async function searchNearbyMembers(excludeMemberId: string, input: NearbySearchInput) {
  const q = input.q?.trim() ?? "";
  const place = input.place?.trim() ?? "";
  const chapterId = input.chapterId ?? "";
  const categoryId = input.categoryId ?? "";
  const radius = RADIUS_OPTIONS.includes(Number(input.radius)) ? Number(input.radius) : DEFAULT_RADIUS_KM;
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const hasCoords = input.lat !== undefined && input.lng !== undefined && input.lat !== "" && isValidLatLng(lat, lng);
  const searched = Boolean(q || place || chapterId || categoryId || hasCoords);

  const scope = await fellowMemberScope(excludeMemberId);
  const [chapters, categories] = await Promise.all([
    db.chapter.findMany({
      where: scope.chapterId ? { id: scope.chapterId as string } : { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const where: Prisma.MemberWhereInput = {
    AND: [scope],
    status: "ACTIVE",
    id: { not: excludeMemberId },
    ...(chapterId ? { chapterId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  let results: NearbyResultMember[] = [];
  let withoutLocation = 0;
  let mode: "radius" | "text" | "all" = "all";

  if (hasCoords) {
    // Real distance from the selected place's coordinates — never locality
    // name matching. ~140 members total, so filtering in JS is cheap.
    mode = "radius";
    const [located, unlocated] = await Promise.all([
      db.member.findMany({ where: { ...where, latitude: { not: null }, longitude: { not: null } }, select: nearbyMemberSelect }),
      // AND, not a spread: `where` carries its own OR for a name search,
      // which a spread `OR` key would silently replace.
      db.member.count({ where: { AND: [where, { OR: [{ latitude: null }, { longitude: null }] }] } }),
    ]);
    withoutLocation = unlocated;
    results = located
      .map((m) => ({ ...m, distance: distanceKm({ lat, lng }, { lat: m.latitude!, lng: m.longitude! }) }))
      .filter((m) => m.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  } else {
    // No coordinates (no Google key, or text typed without picking a
    // suggestion): fall back to the old text match on address/area.
    if (place) mode = "text";
    const textWhere: Prisma.MemberWhereInput = place
      ? {
          AND: [
            where,
            {
              OR: [
                { address: { contains: place, mode: "insensitive" } },
                { areasServed: { contains: place, mode: "insensitive" } },
                { locationLabel: { contains: place, mode: "insensitive" } },
              ],
            },
          ],
        }
      : where;
    results = searched
      ? (await db.member.findMany({ where: textWhere, select: nearbyMemberSelect, orderBy: { name: "asc" } })).map((m) => ({ ...m, distance: null }))
      : [];
  }

  return { q, place, chapterId, categoryId, radius, lat, lng, hasCoords, searched, mode, results, withoutLocation, chapters, categories };
}
