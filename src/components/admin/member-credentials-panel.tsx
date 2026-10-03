"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateMemberCredentials,
  reissueTemporaryCredentials,
  type IssuedCredential,
} from "@/app/admin/(dashboard)/member-credentials/actions";

export type CredentialMemberRow = {
  id: string;
  name: string;
  chapter: string;
  category: string;
  state: "NONE" | "PENDING" | "ACTIVATED";
  username: string | null;
  email: string | null;
  issuedAt: string | null;
};

const STATE_LABEL: Record<CredentialMemberRow["state"], { text: string; className: string }> = {
  NONE: { text: "No login", className: "bg-neutral-100 text-neutral-600" },
  PENDING: { text: "Temporary — not activated", className: "bg-amber-50 text-amber-800" },
  ACTIVATED: { text: "Activated", className: "bg-emerald-50 text-emerald-700" },
};

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCsv(rows: IssuedCredential[]) {
  const header = ["Member", "Chapter", "Category", "Temporary Username", "Temporary Password"];
  const lines = [header, ...rows.map((r) => [r.memberName, r.chapter, r.category, r.username, r.password])]
    .map((cols) => cols.map(csvCell).join(","))
    .join("\r\n");
  // BOM so Excel opens it as UTF-8 (member names can include non-ASCII).
  const blob = new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bwf-member-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function MemberCredentialsPanel({ rows }: { rows: CredentialMemberRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<IssuedCredential[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<"ALL" | CredentialMemberRow["state"]>("ALL");

  const counts = useMemo(
    () => ({
      NONE: rows.filter((r) => r.state === "NONE").length,
      PENDING: rows.filter((r) => r.state === "PENDING").length,
      ACTIVATED: rows.filter((r) => r.state === "ACTIVATED").length,
    }),
    [rows],
  );
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.state === filter);
  const pendingIds = rows.filter((r) => r.state === "PENDING").map((r) => r.id);

  function run(action: () => Promise<{ error?: string; issued?: IssuedCredential[]; skipped?: number }>, verb: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          setError(result.error);
          return;
        }
        setIssued(result.issued ?? []);
        setSelected([]);
        setMessage(
          `${verb} ${result.issued?.length ?? 0} credential${result.issued?.length === 1 ? "" : "s"}` +
            (result.skipped ? ` · ${result.skipped} skipped (already had a login or changed meanwhile)` : "") +
            ".",
        );
        router.refresh();
      } catch {
        setError("Couldn't complete that — your session may need re-confirming. Reload the page and try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["NONE", "PENDING", "ACTIVATED"] as const).map((state) => (
          <div key={state} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{STATE_LABEL[state].text}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{counts[state]}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <button
          type="button"
          disabled={pending || counts.NONE === 0}
          onClick={() => {
            if (confirm(`Create temporary logins for ${counts.NONE} member(s) without one?`)) {
              run(generateMemberCredentials, "Generated");
            }
          }}
          className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Working…" : `Generate Member Login Credentials (${counts.NONE})`}
        </button>
        <button
          type="button"
          disabled={pending || selected.length === 0}
          onClick={() => {
            if (confirm(`Reset ${selected.length} not-yet-activated member(s) to the temporary password 1234?`)) {
              run(() => reissueTemporaryCredentials(selected), "Reset");
            }
          }}
          className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:opacity-50"
        >
          Reset to temporary password ({selected.length})
        </button>
        <p className="text-xs text-neutral-500">Reset works only for members who haven&rsquo;t activated yet.</p>
      </div>

      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {issued ? (
        <div className="rounded-lg border-2 border-emerald-700 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{message}</h2>
              <p className="mt-1 text-xs text-neutral-600">Download the sheet to share each row with that member.</p>
            </div>
            {issued.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsv(issued)}
                  className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Download CSV (Excel)
                </button>
                <button
                  type="button"
                  onClick={() => setIssued(null)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:border-neutral-400"
                >
                  Hide
                </button>
              </div>
            ) : null}
          </div>
          {issued.length > 0 ? (
            <div className="mt-4 max-h-96 overflow-auto rounded border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">Chapter</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Username</th>
                    <th className="px-3 py-2 font-medium">Temporary password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {issued.map((r) => (
                    <tr key={r.memberId}>
                      <td className="px-3 py-2 text-neutral-900">{r.memberName}</td>
                      <td className="px-3 py-2 text-neutral-600">{r.chapter}</td>
                      <td className="px-3 py-2 text-neutral-600">{r.category}</td>
                      <td className="px-3 py-2 font-mono text-neutral-900">{r.username}</td>
                      <td className="px-3 py-2 font-mono text-neutral-900">{r.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "NONE", "PENDING", "ACTIVATED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f ? "border-emerald-800 bg-emerald-800 text-white" : "border-neutral-300 text-neutral-600"
              }`}
            >
              {f === "ALL" ? `All (${rows.length})` : `${STATE_LABEL[f].text} (${counts[f]})`}
            </button>
          ))}
          {pendingIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelected(selected.length === pendingIds.length ? [] : pendingIds)}
              className="ml-auto text-xs text-neutral-600 underline"
            >
              {selected.length === pendingIds.length ? "Clear selection" : "Select all not-activated"}
            </button>
          ) : null}
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3 font-medium">Member</th>
                <th className="px-3 py-3 font-medium">Chapter</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Login</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    {r.state === "PENDING" ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.name}`}
                        checked={selected.includes(r.id)}
                        onChange={() =>
                          setSelected((prev) => (prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]))
                        }
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-neutral-900">{r.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{r.chapter}</td>
                  <td className="px-3 py-2 text-neutral-600">{r.category}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {[r.username, r.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_LABEL[r.state].className}`}>
                      {STATE_LABEL[r.state].text}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
