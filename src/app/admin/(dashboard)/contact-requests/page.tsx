import { getChapterScope } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_LIMIT = 200;

/**
 * Phase 29 — every "View contact details" request made on a public member
 * profile: who asked, for which member, and what they needed. Chapter-scoped
 * the same way Members/Visitors are (Chapter Admin sees requests for their
 * own chapter's members only). Read-only — a record of enquiries, not a
 * workflow (the client removed the general Leads pipeline in Phase 20).
 */
export default async function ContactRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; q?: string; from?: string; to?: string }>;
}) {
  const scope = await getChapterScope("contact_requests:view");
  const params = await searchParams;

  const chapters = scope === "ALL" ? await db.chapter.findMany({ orderBy: { name: "asc" } }) : [];
  const chapterId = scope === "ALL" ? params.chapterId || undefined : scope;
  const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const from = isDate(params.from);
  const to = isDate(params.to);
  const q = params.q?.trim();

  const where: Prisma.VendorContactRequestWhereInput = {
    ...(chapterId ? { member: { chapterId } } : {}),
    ...(q
      ? {
          OR: [
            { requesterName: { contains: q, mode: "insensitive" } },
            { requesterPhone: { contains: q } },
            { member: { name: { contains: q, mode: "insensitive" }, ...(chapterId ? { chapterId } : {}) } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lt: new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) } : {}),
          },
        }
      : {}),
  };

  const [requests, total] = await Promise.all([
    db.vendorContactRequest.findMany({
      where,
      include: { member: { include: { chapter: true, category: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_LIMIT,
    }),
    db.vendorContactRequest.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Vendor Contact Requests</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          People who asked to see a member&rsquo;s phone, WhatsApp and email from their public
          profile. {total} request{total === 1 ? "" : "s"} match these filters.
        </p>
      </div>

      <form action="/admin/contact-requests" method="GET" className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        {scope === "ALL" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Chapter
            <select name="chapterId" defaultValue={params.chapterId ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">All chapters</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Search
          <input name="q" defaultValue={q} placeholder="Requester, phone or member…" className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          From
          <input type="date" name="from" defaultValue={from} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          To
          <input type="date" name="to" defaultValue={to} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Requested by</th>
              <th className="px-4 py-3">Member viewed</th>
              <th className="px-4 py-3">Requirement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {requests.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-neutral-900">
                  {r.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  {r.reusedFromDevice ? <p className="text-xs text-neutral-400">Returning visitor</p> : null}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{r.requesterName}</p>
                  <p className="text-xs text-neutral-500">
                    <a href={`tel:${r.requesterPhone}`} className="hover:underline">
                      {r.requesterPhone}
                    </a>
                    {r.requesterEmail ? (
                      <>
                        {" · "}
                        <a href={`mailto:${r.requesterEmail}`} className="hover:underline">
                          {r.requesterEmail}
                        </a>
                      </>
                    ) : null}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-neutral-900">{r.member.name}</p>
                  <p className="text-xs text-neutral-500">
                    {r.member.category.name} · {r.member.chapter.name}
                  </p>
                </td>
                <td className="max-w-md whitespace-pre-line px-4 py-3 text-neutral-700">{r.requirement || <span className="text-neutral-400">—</span>}</td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No contact requests match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {requests.length === PAGE_LIMIT ? <p className="text-xs text-neutral-500">Showing the latest {PAGE_LIMIT} — narrow the filters to see older requests.</p> : null}
    </div>
  );
}
