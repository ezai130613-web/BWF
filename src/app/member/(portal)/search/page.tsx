import Link from "next/link";
import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";

const PAGE_SIZE = 12;

export default async function MemberSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chapter?: string; category?: string; location?: string; page?: string }>;
}) {
  await requireMemberProfile();
  const { q, chapter: chapterId, category: categoryId, location, page: pageParam } = await searchParams;

  const [chapters, categories] = await Promise.all([
    db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const where = {
    status: "ACTIVE" as const,
    ...(chapterId ? { chapterId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(location
      ? {
          OR: [
            { address: { contains: location, mode: "insensitive" as const } },
            { areasServed: { contains: location, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const totalMembers = await db.member.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalMembers / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const members = await db.member.findMany({
    where,
    include: { company: true, chapter: true, category: true },
    orderBy: { name: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  function buildHref(targetPage: number) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (chapterId) qs.set("chapter", chapterId);
    if (categoryId) qs.set("category", categoryId);
    if (location) qs.set("location", location);
    if (targetPage > 1) qs.set("page", String(targetPage));
    const query = qs.toString();
    return query ? `/member/search?${query}` : "/member/search";
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Find the Right Member</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Search by name, business, category, chapter, or location — meeting delayed nearby? Find
          a relevant member and turn free time into networking time.
        </p>
      </div>

      <form action="/member/search" method="GET" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Name or company…"
          className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <input
          type="text"
          name="location"
          defaultValue={location}
          placeholder="Area / location (e.g. Royapettah)"
          className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <select
          name="chapter"
          defaultValue={chapterId ?? ""}
          className="w-full min-w-0 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex min-w-0 gap-2">
          <select
            name="category"
            defaultValue={categoryId ?? ""}
            className="w-full min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="flex-shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Search
          </button>
        </div>
      </form>

      <div>
        <p className="text-sm text-neutral-500">
          {totalMembers} member{totalMembers === 1 ? "" : "s"}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {members.map((m) => (
            <div key={m.id} className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-4">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-pasted or R2 URL
                <img src={m.photoUrl} alt={m.name} className="h-16 w-16 flex-shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-lg font-medium text-neutral-500">
                  {m.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">{m.name}</p>
                <p className="text-sm text-neutral-600">{m.company.name}</p>
                <p className="text-xs text-neutral-500">
                  {m.category.name} · {m.chapter.name}
                </p>
                {m.address ? <p className="mt-1 text-xs text-neutral-500">{m.address}</p> : null}
                <div className="mt-2 flex gap-3">
                  {m.phone ? (
                    <a href={`tel:${m.phone}`} className="text-xs font-medium text-neutral-700 hover:text-neutral-900">
                      Call
                    </a>
                  ) : null}
                  {m.whatsapp || m.phone ? (
                    <a
                      href={`https://wa.me/${(m.whatsapp || m.phone)!.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-neutral-400 sm:col-span-2">No members match your search.</p>
          ) : null}
        </div>

        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link href={buildHref(page - 1)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                ← Previous
              </Link>
            ) : (
              <span className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-300">← Previous</span>
            )}
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={buildHref(page + 1)} className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                Next →
              </Link>
            ) : (
              <span className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-300">Next →</span>
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
