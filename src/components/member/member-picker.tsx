"use client";

import { useId, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { PickerMember } from "@/lib/members/picker";
import { inputClass } from "@/components/member/ui";

/**
 * Chapter → Category → Member selection (2026-10-03). Step 2 lists only
 * categories that have members in the chosen chapter; step 3 lists only
 * that chapter + category's members, with type-to-filter. Submits the
 * chosen id(s) as hidden input(s) named `name`.
 *
 * `multiple` (Conclaves): each pick is added as a chip and the cascade
 * stays open for the next one. Remount with a new `key` to reset it after
 * a successful submit — forms' native reset() can't clear React state.
 */
export function MemberPicker({
  members,
  name,
  label = "Member",
  multiple = false,
  required = true,
  defaultChapterId = "",
}: {
  members: PickerMember[];
  name: string;
  label?: string;
  multiple?: boolean;
  required?: boolean;
  defaultChapterId?: string;
}) {
  const ids = { chapter: useId(), category: useId(), search: useId(), list: useId() };
  const [chapterId, setChapterId] = useState(defaultChapterId);
  const [categoryId, setCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const chapters = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const m of members) {
      const c = map.get(m.chapterId) ?? { id: m.chapterId, name: m.chapterName, count: 0 };
      c.count += 1;
      map.set(m.chapterId, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [members]);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const m of members) {
      if (m.chapterId !== chapterId) continue;
      const c = map.get(m.categoryId) ?? { id: m.categoryId, name: m.categoryName, count: 0 };
      c.count += 1;
      map.set(m.categoryId, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [members, chapterId]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.chapterId === chapterId &&
        m.categoryId === categoryId &&
        (!q || m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q)),
    );
  }, [members, chapterId, categoryId, query]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  function pick(id: string) {
    if (multiple) {
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setSelected([id]);
    }
    setQuery("");
  }

  const single = !multiple && selected[0] ? byId.get(selected[0]) : null;

  return (
    <fieldset className="relative flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium text-neutral-800">{label}</legend>
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {/* Lets the browser's own required-check block an empty submit. */}
      {required && selected.length === 0 ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value=""
          onChange={() => {}}
          onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("Select a chapter, category and member.")}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {single ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-900">{single.name}</p>
            <p className="truncate text-xs text-neutral-600">
              {single.company} · {single.categoryName} · {single.chapterName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          {multiple && selected.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Selected members">
              {selected.map((id) => {
                const m = byId.get(id);
                return m ? (
                  <li key={id} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 py-1 pl-3 pr-1.5 text-xs font-medium text-white">
                    {m.name}
                    <button type="button" aria-label={`Remove ${m.name}`} onClick={() => pick(id)} className="rounded-full p-0.5 hover:bg-emerald-700">
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ) : null;
              })}
            </ul>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.chapter} className="text-xs font-medium text-neutral-600">
                1. Chapter
              </label>
              <select
                id={ids.chapter}
                value={chapterId}
                onChange={(e) => {
                  setChapterId(e.target.value);
                  setCategoryId("");
                  setQuery("");
                }}
                className={inputClass}
              >
                <option value="">Select chapter…</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.category} className="text-xs font-medium text-neutral-600">
                2. Category
              </label>
              <select
                id={ids.category}
                value={categoryId}
                disabled={!chapterId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setQuery("");
                }}
                className={inputClass}
              >
                <option value="">{chapterId ? "Select category…" : "Choose a chapter first"}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.count > 1 ? ` (${c.count})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chapterId && categoryId ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.search} className="text-xs font-medium text-neutral-600">
                3. Member
              </label>
              <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15">
                <div className="flex items-center gap-2 border-b border-neutral-100 px-3.5">
                  <Search className="h-4 w-4 text-neutral-400" aria-hidden />
                  <input
                    id={ids.search}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a name or company…"
                    aria-controls={ids.list}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (candidates.length === 1) pick(candidates[0].id);
                      }
                    }}
                    className="w-full py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>
                <ul id={ids.list} role="listbox" aria-multiselectable={multiple} className="max-h-56 overflow-auto py-1">
                  {candidates.map((m) => {
                    const isSelected = selected.includes(m.id);
                    return (
                      <li key={m.id} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onClick={() => pick(m.id)}
                          className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-emerald-50 ${isSelected ? "bg-emerald-50" : ""}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-neutral-900">{m.name}</span>
                            <span className="block truncate text-xs text-neutral-500">{m.company}</span>
                          </span>
                          {isSelected ? <Check className="h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden /> : null}
                        </button>
                      </li>
                    );
                  })}
                  {candidates.length === 0 ? <li className="px-3.5 py-3 text-sm text-neutral-500">No member matches “{query}”.</li> : null}
                </ul>
              </div>
            </div>
          ) : null}
        </>
      )}
    </fieldset>
  );
}
