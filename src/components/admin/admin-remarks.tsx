import { REMARK_CONTEXT_LABELS, type AdminRemarkView } from "@/lib/remarks";

const CONTEXT_STYLES: Record<AdminRemarkView["context"], string> = {
  MEMBERSHIP_APPROVAL: "bg-emerald-50 text-emerald-700",
  RENEWAL: "bg-indigo-50 text-indigo-700",
  GENERAL: "bg-neutral-100 text-neutral-600",
};

function formatWhen(date: Date) {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

/** Read-only remark history, newest first. Admin pages only. */
export function AdminRemarksList({ remarks, emptyText = "No admin remarks yet." }: { remarks: AdminRemarkView[]; emptyText?: string }) {
  if (remarks.length === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>;

  return (
    <ul className="flex flex-col divide-y divide-neutral-100">
      {remarks.map((remark) => (
        <li key={remark.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className={`rounded-full px-2 py-0.5 font-medium ${CONTEXT_STYLES[remark.context]}`}>
              {REMARK_CONTEXT_LABELS[remark.context]}
            </span>
            <span>
              {remark.authorName} · {formatWhen(remark.createdAt)}
              {remark.source ? ` · ${remark.source}` : ""}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-neutral-900">{remark.body}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Compact version for cards that are about something else (a payment under
 * review): the latest remark in full, the rest behind a toggle.
 */
export function AdminRemarksSummary({ remarks }: { remarks: AdminRemarkView[] }) {
  if (remarks.length === 0) return null;
  const [latest, ...older] = remarks;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <p className="text-xs font-semibold text-amber-900">
        Admin remarks on this member ({remarks.length}) — internal, not shown to the member
      </p>
      <div className="mt-2">
        <AdminRemarksList remarks={[latest]} />
      </div>
      {older.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-amber-900 hover:underline">
            Show {older.length} earlier remark{older.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2">
            <AdminRemarksList remarks={older} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
