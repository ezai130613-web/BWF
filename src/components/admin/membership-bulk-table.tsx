"use client";

import { useActionState, useState } from "react";
import { saveMembershipBulk, type BulkMembershipState } from "@/app/admin/(dashboard)/members/membership/actions";
import { addDaysKey, termYearAt } from "@/lib/payments/membership-term";

type Row = { id: string; name: string; chapter: string; joinedKey: string; paid: number[]; onSite: number[] };

const dateInput = "rounded-lg border border-neutral-300 px-2 py-1.5 text-sm text-neutral-900";

/** "2024-01-15", "15/01/2024", "15-01-2024" → "2024-01-15" (or null). */
function parseDate(raw: string): string | null {
  const t = raw.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const check = new Date(`${iso}T00:00:00Z`);
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d ? iso : null;
}

export function MembershipBulkTable({ rows, todayKey, dueDays }: { rows: Row[]; todayKey: string; dueDays: number }) {
  const [state, formAction, pending] = useActionState(saveMembershipBulk, {} as BulkMembershipState);
  const [joined, setJoined] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.joinedKey])));
  const [paid, setPaid] = useState<Record<string, number[]>>(() => Object.fromEntries(rows.map((r) => [r.id, r.paid])));
  const [pasted, setPasted] = useState("");
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const endKey = addDaysKey(todayKey, dueDays);
  const years = (r: Row) => {
    const j = joined[r.id];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j)) return [] as number[];
    const first = Number(j.slice(0, 4));
    const last = termYearAt(j, endKey > j ? endKey : j);
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  };
  const maxYears = Math.max(1, ...rows.map((r) => years(r).length));
  const isPaid = (r: Row, y: number) => r.onSite.includes(y) || (paid[r.id] ?? []).includes(y);

  function toggle(r: Row, y: number, on: boolean) {
    setPaid((p) => {
      const cur = new Set(p[r.id] ?? []);
      if (on) cur.add(y);
      else cur.delete(y);
      return { ...p, [r.id]: [...cur] };
    });
  }
  /** Tick (or untick) "Year n" for every listed member that has that year. */
  function toggleColumn(n: number, on: boolean) {
    setPaid((p) => {
      const next = { ...p };
      for (const r of rows) {
        const y = years(r)[n];
        if (y === undefined || r.onSite.includes(y)) continue;
        const cur = new Set(next[r.id] ?? []);
        if (on) cur.add(y);
        else cur.delete(y);
        next[r.id] = [...cur];
      }
      return next;
    });
  }
  function applyPaste() {
    const byName = new Map(rows.map((r) => [r.name.trim().toLowerCase(), r.id]));
    const next = { ...joined };
    let ok = 0;
    const bad: string[] = [];
    for (const line of pasted.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parts = line.split(/\t|,|;/).map((x) => x.trim());
      const date = parts.length > 1 ? parseDate(parts[parts.length - 1]) : null;
      const id = byName.get(parts.slice(0, parts.length - 1).join(",").trim().toLowerCase());
      if (id && date) {
        next[id] = date;
        ok++;
      } else bad.push(line.trim());
    }
    setJoined(next);
    setPasteMsg(`${ok} date(s) filled in${bad.length ? `. Not matched (${bad.length}): ${bad.slice(0, 5).join(" | ")}${bad.length > 5 ? " …" : ""}` : ""}. Press Save to keep them.`);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <details className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-neutral-800">Have the dates in a spreadsheet? Paste them here</summary>
        <p className="mt-2 text-xs text-neutral-500">
          One member per line: name, then the joining date (like <code>Ravi Kumar, 15/01/2024</code>). Copy two columns straight from Excel. Names must match the list below.
        </p>
        <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} className="mt-2 w-full rounded-lg border border-neutral-300 p-2 text-sm" />
        <button type="button" onClick={applyPaste} className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-emerald-700">
          Fill in dates
        </button>
        {pasteMsg ? <p className="mt-2 text-xs text-neutral-600">{pasteMsg}</p> : null}
      </details>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">Joining date</th>
              {Array.from({ length: maxYears }, (_, n) => (
                <th key={n} className="px-3 py-2.5 text-center font-medium normal-case">
                  <span className="block text-xs uppercase tracking-wide">Year {n + 1} paid</span>
                  <span className="mt-0.5 flex justify-center gap-2 text-[11px] font-normal normal-case">
                    <button type="button" onClick={() => toggleColumn(n, true)} className="text-emerald-800 underline">
                      all
                    </button>
                    <button type="button" onClick={() => toggleColumn(n, false)} className="text-neutral-500 underline">
                      none
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const ys = years(r);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-2">
                    <input type="hidden" name="memberId" value={r.id} />
                    <p className="font-medium text-neutral-900">{r.name}</p>
                    <p className="text-xs text-neutral-500">{r.chapter}</p>
                  </td>
                  <td className="px-4 py-2">
                    <input type="date" name={`joined_${r.id}`} value={joined[r.id]} max={todayKey} onChange={(e) => setJoined((j) => ({ ...j, [r.id]: e.target.value }))} className={dateInput} />
                  </td>
                  {Array.from({ length: maxYears }, (_, n) => {
                    const y = ys[n];
                    return (
                      <td key={n} className="px-3 py-2 text-center">
                        {y === undefined ? (
                          <span className="text-neutral-300">—</span>
                        ) : (
                          <label className="inline-flex flex-col items-center gap-0.5" title={r.onSite.includes(y) ? "Paid on the website" : undefined}>
                            <input
                              type="checkbox"
                              name={`paid_${r.id}`}
                              value={y}
                              checked={isPaid(r, y)}
                              disabled={r.onSite.includes(y)}
                              onChange={(e) => toggle(r, y, e.target.checked)}
                              className="h-4 w-4 accent-emerald-800"
                            />
                            <span className="text-[10px] text-neutral-400">{r.onSite.includes(y) ? "site" : y}</span>
                          </label>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2 + maxYears} className="px-4 py-10 text-center text-neutral-400">
                  No members found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 shadow-md backdrop-blur">
        <button type="submit" disabled={pending || rows.length === 0} className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
          {pending ? "Saving…" : "Save all changes"}
        </button>
        <p className="text-xs text-neutral-500">Year 1 = the first 12 months from the joining date, Year 2 the next, and so on.</p>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.saved !== undefined && !pending && !state.error ? <p className="text-sm text-emerald-700">Saved — {state.saved} member(s) updated.</p> : null}
      </div>
    </form>
  );
}
