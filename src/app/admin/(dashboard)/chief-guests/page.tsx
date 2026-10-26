import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { CreateChiefGuestForm } from "@/components/admin/create-chief-guest-form";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ExportButton } from "@/components/admin/export-button";

export default async function ChiefGuestsPage() {
  await requirePermission("chief_guests:manage");

  const [guests, chapters] = await Promise.all([
    db.chiefGuest.findMany({
      include: { chapter: true },
      orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Chief Guests</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Business leaders and decision-makers who&rsquo;ve visited BWF meetings — shown as social
            proof in the homepage carousel. No fixed limit on how many can be added.
          </p>
        </div>
        <ExportButton dataset="chief-guests" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Chapter</th>
              <th className="px-4 py-3 font-medium">Date visited</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Homepage</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {guests.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3 text-neutral-900">{g.name}</td>
                <td className="px-4 py-3 text-neutral-600">{g.company}</td>
                <td className="px-4 py-3 text-neutral-600">{g.chapter?.name ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{g.visitedAt ? g.visitedAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{g.displayOrder ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      g.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {g.isPublished ? "Published" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/chief-guests/${g.id}`} className="text-sm text-neutral-500 hover:text-emerald-800">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
            {guests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No Chief Guests added yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <CreateChiefGuestForm chapters={chapters} />
    </div>
  );
}
