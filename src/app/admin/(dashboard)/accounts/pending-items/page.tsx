import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getAssignableAdmins, getPendingItems, parsePendingFilters, PENDING_STATUS_LABELS } from "@/lib/accounts/pending-items";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { ReportDownloads } from "@/components/admin/report-downloads";
import { PendingItemForm } from "@/components/admin/pending-item-form";

const field = "rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-900";
const istKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const istShort = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const TONE = { OPEN: "bg-red-50 text-red-700", IN_PROGRESS: "bg-amber-50 text-amber-700", DONE: "bg-emerald-50 text-emerald-700" } as const;

/** 2026-11-17 client request — "Pending Points": what is pending as on date, expected completion date and remarks; Excel/PDF download with from/to dates. */
export default async function PendingItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ chapterId?: string; assignedTo?: string; from?: string; to?: string; status?: string }>;
}) {
  await requirePermission("accounts:view");
  const filters = parsePendingFilters(await searchParams);
  const [items, chapters, admins] = await Promise.all([
    getPendingItems(filters),
    db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getAssignableAdmins(),
  ]);
  const today = istKey(new Date());
  const counts = { OPEN: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const i of items) counts[i.status]++;
  const downloadParams = { chapterId: filters.chapterId, assignedTo: filters.assignedToUserId, from: filters.from, to: filters.to, status: filters.status };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            <AdminPageIcon />Pending Points
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Everything still pending — as on date, expected date of completion and remarks. The date range filters on the date a point was raised.
          </p>
        </div>
        <ReportDownloads report="pending-items" params={downloadParams} />
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Chapter
          <select name="chapterId" defaultValue={filters.chapterId ?? ""} className={field}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Assigned to
          <select name="assignedTo" defaultValue={filters.assignedToUserId ?? ""} className={field}>
            <option value="">Everyone</option>
            <option value="NONE">Unassigned</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={field}>
            <option value="">All</option>
            <option value="ACTIVE">Not done (open + in progress)</option>
            {Object.entries(PENDING_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          From date
          <input type="date" name="from" defaultValue={filters.from} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          To date
          <input type="date" name="to" defaultValue={filters.to} className={field} />
        </label>
        <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
          Apply
        </button>
        <Link href="/admin/accounts/pending-items" className="pb-2 text-sm text-neutral-500 underline hover:text-emerald-800">
          Reset
        </Link>
      </form>

      <p className="text-sm text-neutral-600">
        {items.length} point(s) · {counts.OPEN} open · {counts.IN_PROGRESS} in progress · {counts.DONE} done
      </p>

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-neutral-400">No pending points for these filters.</p> : null}
        {items.map((i) => {
          const overdue = i.status !== "DONE" && i.expectedOn && istKey(i.expectedOn) < today;
          return (
            <details key={i.id} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm">
                <span className="flex flex-col">
                  <span className="font-medium text-neutral-900">{i.title}</span>
                  <span className="text-neutral-500">
                    {i.chapter?.name ?? "All chapters"} · assigned to {i.assignedTo?.name ?? "nobody"} · raised {istShort(i.raisedOn)}
                    {i.expectedOn ? ` · expected ${istShort(i.expectedOn)}` : " · no expected date"}
                    {overdue ? <span className="font-medium text-red-600"> · overdue</span> : null}
                  </span>
                  {i.remarks ? <span className="mt-0.5 text-neutral-600">Remarks: {i.remarks}</span> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[i.status]}`}>{PENDING_STATUS_LABELS[i.status]}</span>
                  <span className="text-neutral-500 group-open:hidden">Edit →</span>
                  <span className="hidden text-neutral-500 group-open:inline">Close</span>
                </span>
              </summary>
              <div className="mt-4">
                <PendingItemForm
                  chapters={chapters}
                  admins={admins}
                  today={today}
                  item={{
                    id: i.id,
                    title: i.title,
                    details: i.details ?? "",
                    remarks: i.remarks ?? "",
                    chapterId: i.chapterId ?? "",
                    assignedToUserId: i.assignedToUserId ?? "",
                    status: i.status,
                    raisedOn: istKey(i.raisedOn),
                    expectedOn: i.expectedOn ? istKey(i.expectedOn) : "",
                  }}
                />
              </div>
            </details>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Add a pending point</h2>
        <div className="mt-4">
          <PendingItemForm chapters={chapters} admins={admins} today={today} />
        </div>
      </div>
    </div>
  );
}
