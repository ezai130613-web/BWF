import Link from "next/link";
import { MapPin, Phone, MessageCircle, ExternalLink, Navigation } from "lucide-react";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { RADIUS_OPTIONS, distanceKm, formatDistance, isValidLatLng } from "@/lib/geo";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps/loader";
import type { Prisma } from "@/generated/prisma/client";
import { Card, EmptyState, PageHeader } from "@/components/member/ui";
import { NearbySearchForm } from "@/components/member/nearby-search-form";
import { MembersMap } from "@/components/member/members-map";

const PAGE_SIZE = 24;
const DEFAULT_RADIUS_KM = 5;

type SearchParams = {
  q?: string;
  chapter?: string;
  category?: string;
  place?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  page?: string;
  /** Legacy text param from the old form — treated as `place`. */
  location?: string;
};

const memberSelect = {
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

type ResultMember = Prisma.MemberGetPayload<{ select: typeof memberSelect }> & { distance: number | null };

/** "Arumbakkam, Chennai, Tamil Nadu, India" → "Arumbakkam, Chennai" */
function locality(m: ResultMember) {
  const source = m.locationLabel ?? m.address ?? "";
  return source.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2).join(", ");
}

export default async function MemberSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { member: me } = await requireMemberProfile();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const place = (params.place ?? params.location ?? "").trim();
  const chapterId = params.chapter ?? "";
  const categoryId = params.category ?? "";
  const radius = RADIUS_OPTIONS.includes(Number(params.radius)) ? Number(params.radius) : DEFAULT_RADIUS_KM;
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const hasCoords = params.lat !== undefined && params.lng !== undefined && params.lat !== "" && isValidLatLng(lat, lng);
  const searched = Boolean(q || place || chapterId || categoryId || hasCoords);

  const [chapters, categories] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const where: Prisma.MemberWhereInput = {
    status: "ACTIVE",
    id: { not: me.id },
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

  let results: ResultMember[] = [];
  let withoutLocation = 0;
  let mode: "radius" | "text" | "all" = "all";

  if (hasCoords) {
    // Real distance from the selected place's coordinates — never locality
    // name matching. ~140 members total, so filtering in JS is cheap.
    mode = "radius";
    const [located, unlocated] = await Promise.all([
      db.member.findMany({ where: { ...where, latitude: { not: null }, longitude: { not: null } }, select: memberSelect }),
      db.member.count({ where: { ...where, OR: [{ latitude: null }, { longitude: null }] } }),
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
      ? (await db.member.findMany({ where: textWhere, select: memberSelect, orderBy: { name: "asc" } })).map((m) => ({ ...m, distance: null }))
      : [];
  }

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pageResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function buildHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (place) qs.set("place", place);
    if (hasCoords) {
      qs.set("lat", String(lat));
      qs.set("lng", String(lng));
    }
    qs.set("radius", String(radius));
    if (chapterId) qs.set("chapter", chapterId);
    if (categoryId) qs.set("category", categoryId);
    if (targetPage > 1) qs.set("page", String(targetPage));
    return `/member/search?${qs}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={MapPin}
        title="Find Members Nearby"
        description="In an area with time to spare? Pick the place and see every BWF member within 5 km — nearest first — so you can drop in and meet."
      />

      <Card>
        <NearbySearchForm
          defaults={{ q, place, lat: hasCoords ? String(lat) : "", lng: hasCoords ? String(lng) : "", radius, chapter: chapterId, category: categoryId }}
          chapters={chapters}
          categories={categories}
        />
        {!GOOGLE_MAPS_API_KEY ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Location suggestions and distance search switch on once BWF adds a Google Maps key. Until then, the area is
            matched against members&rsquo; saved addresses.
          </p>
        ) : null}
      </Card>

      {!searched ? (
        <Card>
          <EmptyState icon={Navigation} message="Choose a place to see members within 5 km, or search by name, chapter or category." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-neutral-700">
              <span className="font-semibold text-neutral-900">{total}</span> member{total === 1 ? "" : "s"}
              {mode === "radius" ? (
                <>
                  {" "}within <span className="font-semibold">{radius} km</span> of <span className="font-semibold">{place || "the selected place"}</span>
                </>
              ) : mode === "text" ? (
                <> matching &ldquo;{place}&rdquo; in their address</>
              ) : null}
              {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
            </p>
            {mode === "radius" && withoutLocation > 0 ? (
              <p className="text-xs text-neutral-500">
                {withoutLocation} member{withoutLocation === 1 ? " hasn't" : "s haven't"} set a business location yet and can&rsquo;t appear in distance results.
              </p>
            ) : null}
          </div>

          <div className={mode === "radius" && total > 0 ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-5" : ""}>
            {mode === "radius" && total > 0 ? (
              <div className="lg:sticky lg:top-6 lg:col-span-2 lg:order-2">
                <MembersMap
                  center={{ lat, lng, label: place || "Searched place" }}
                  radiusKm={radius}
                  members={results.map((m) => ({
                    id: m.id,
                    name: m.name,
                    lat: m.latitude!,
                    lng: m.longitude!,
                    subtitle: `${m.company.name} · ${m.category.name} · ${m.distance !== null ? formatDistance(m.distance) : ""}`,
                  }))}
                />
              </div>
            ) : null}
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${mode === "radius" && total > 0 ? "lg:col-span-3 lg:order-1" : "xl:grid-cols-3"}`}>
              {pageResults.map((m) => (
                <article key={m.id} className="flex gap-4 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-pasted or R2 URL
                    <img src={m.photoUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-900">
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-neutral-900">{m.name}</h2>
                      {m.distance !== null ? (
                        <span className="flex-shrink-0 rounded-full bg-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {formatDistance(m.distance)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-neutral-700">{m.company.name}</p>
                    <p className="text-xs text-neutral-500">
                      {m.category.name} | {m.chapter.name}
                    </p>
                    {locality(m) ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                        <span className="truncate">{locality(m)}</span>
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.phone ? (
                        <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-emerald-700 hover:text-emerald-800">
                          <Phone className="h-3 w-3" aria-hidden /> Call
                        </a>
                      ) : null}
                      {m.whatsapp || m.phone ? (
                        <a
                          href={`https://wa.me/${(m.whatsapp || m.phone)!.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-emerald-700 hover:text-emerald-800"
                        >
                          <MessageCircle className="h-3 w-3" aria-hidden /> WhatsApp
                        </a>
                      ) : null}
                      {m.latitude !== null && m.longitude !== null ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-emerald-700 hover:text-emerald-800"
                        >
                          <Navigation className="h-3 w-3" aria-hidden /> Directions
                        </a>
                      ) : null}
                      <Link href={`/members/${m.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-800 hover:underline">
                        Profile <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
              {total === 0 ? (
                <div className="sm:col-span-2 xl:col-span-3">
                  <Card>
                    <EmptyState
                      message={mode === "radius" ? `No members within ${radius} km. Try a wider radius.` : "No members match your search."}
                    />
                  </Card>
                </div>
              ) : null}
            </div>
          </div>

          {totalPages > 1 ? (
            <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
              {page > 1 ? (
                <Link href={buildHref(page - 1)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:border-emerald-700">
                  ← Previous
                </Link>
              ) : null}
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={buildHref(page + 1)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700 hover:border-emerald-700">
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
