"use client";

import { useMemo, useState } from "react";
import type { MarketingScriptRow } from "@/components/admin/script-editor-form";
import { CONTENT_FORMAT_LABELS, SCRIPT_STATUSES, SCRIPT_STATUS_BADGE_CLASSES, SCRIPT_STATUS_LABELS, formatScriptNumber } from "@/lib/marketing/constants";

/** Client spec §5C — saved scripts with search/filter; §5B's "+ Create New Script." */
export function MyScriptsSection({
  scripts,
  onCreate,
  onEdit,
}: {
  scripts: MarketingScriptRow[];
  onCreate: () => void;
  onEdit: (script: MarketingScriptRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scripts.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || (s.topic ?? "").toLowerCase().includes(q) || formatScriptNumber(s.scriptNumber).toLowerCase().includes(q);
    });
  }, [scripts, query, statusFilter]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">My Scripts</h2>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Create New Script
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, or script number…"
          className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          {SCRIPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SCRIPT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Script</th>
              <th className="px-4 py-3 font-medium">Topic</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Last updated</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((s) => (
              <tr key={s.id} onClick={() => onEdit(s)} className="cursor-pointer hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{s.title}</p>
                  <p className="text-xs text-neutral-500">{formatScriptNumber(s.scriptNumber)}</p>
                </td>
                <td className="px-4 py-3 text-neutral-600">{s.topic || "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{CONTENT_FORMAT_LABELS[s.contentType]}</td>
                <td className="px-4 py-3 text-neutral-600">{s.updatedAt.toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCRIPT_STATUS_BADGE_CLASSES[s.status]}`}>
                    {SCRIPT_STATUS_LABELS[s.status]}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  {scripts.length === 0 ? "No scripts saved yet." : "No scripts match your search."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
