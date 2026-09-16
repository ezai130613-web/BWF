"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRoster } from "@/app/admin/(dashboard)/roster/[meetingId]/actions";
import type { RosterWizardData, RosterWizardMember } from "@/lib/roster/manage";
import {
  GUEST_SELF_INTRODUCTION_HEADING,
  GUEST_SELF_INTRODUCTION_INSTRUCTIONS,
  GUEST_SELF_INTRODUCTION_LINES,
  GUEST_SELF_INTRODUCTION_SALUTATION,
  PLEDGE_HEADING,
  PLEDGE_LINES,
} from "@/lib/roster/static-content";

/**
 * Roster Sheet interactive management (2026-09-16 correction) — steps 3–7
 * of the wizard, run entirely client-side off the one payload
 * `getRosterWizardData()` computed server-side, same precedent as the
 * Phase 7 `/apply` wizard. Steps 1–2 (chapter, meeting) stay plain
 * GET-form/link pages (src/app/admin/(dashboard)/roster/page.tsx) — no
 * client JS needed there.
 *
 * All edits live in this component's own state; nothing is persisted until
 * "Save Roster" is clicked (requirement 9) — Back/Next between steps never
 * loses unsaved work. Ranking is recomputed only on Save (requirement 4),
 * but the Review step previews the same stable-sort-by-score projection
 * Save will actually persist, so the admin can see the result before
 * committing rather than saving blind.
 */

type StepNumber = 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<StepNumber, string> = {
  3: "Manage Members & Scores",
  4: "Select Open Categories",
  5: "Configure Notes",
  6: "Review & Save",
  7: "Download PDF",
};

function snapshotFor(chiefGuestIds: string[], openCategoryIds: string[], notesEnabled: boolean, members: { id: string; score: number }[]) {
  return JSON.stringify({
    chiefGuestIds: [...chiefGuestIds].sort(),
    openCategoryIds: [...openCategoryIds].sort(),
    notesEnabled,
    members: members.map((m) => `${m.id}:${m.score}`).sort(),
  });
}

function rankedByScore(members: RosterWizardMember[]): RosterWizardMember[] {
  // Array.prototype.sort is stable — equal scores keep their current
  // relative (already-displayed) order, satisfying "retain previous
  // relative order" with no extra bookkeeping.
  return [...members].sort((a, b) => b.score - a.score);
}

export function RosterWizard({ data }: { data: RosterWizardData }) {
  const [step, setStep] = useState<StepNumber>(3);
  const [chiefGuestIds, setChiefGuestIds] = useState<string[]>(data.selectedChiefGuestIds);
  const [members, setMembers] = useState<RosterWizardMember[]>(data.allOtherMembers);
  const [openCategoryIds, setOpenCategoryIds] = useState<string[]>(data.selectedOpenCategoryIds);
  const [notesEnabled, setNotesEnabled] = useState(data.notesEnabled);

  const [isSaved, setIsSaved] = useState(data.isSaved);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotFor(data.selectedChiefGuestIds, data.selectedOpenCategoryIds, data.notesEnabled, data.allOtherMembers),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const currentSnapshot = snapshotFor(chiefGuestIds, openCategoryIds, notesEnabled, members);
  const dirty = currentSnapshot !== savedSnapshot;
  const canDownload = isSaved && !dirty;

  const preview = useMemo(() => rankedByScore(members), [members]);

  function toggleChiefGuest(id: string) {
    setChiefGuestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleCategory(id: string) {
    setOpenCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function updateScore(memberId: string, rawValue: string) {
    const score = rawValue === "" ? 0 : Math.max(0, Math.trunc(Number(rawValue)) || 0);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, score } : m)));
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveRoster({
        meetingId: data.meetingId,
        chiefGuestIds,
        openCategoryIds,
        notesEnabled,
        members: members.map((m) => ({ memberId: m.id, score: m.score })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const ranked = rankedByScore(members);
      setMembers(ranked);
      setIsSaved(true);
      setSavedSnapshot(snapshotFor(chiefGuestIds, openCategoryIds, notesEnabled, ranked));
    });
  }

  const meetingDate = new Date(data.meetingStartsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {([3, 4, 5, 6, 7] as StepNumber[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              step === n
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
            }`}
          >
            Step {n} — {STEP_LABELS[n]}
          </button>
        ))}
      </div>

      {dirty && isSaved ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You have unsaved changes since the last save — Download PDF is disabled until you Save Roster again.
        </p>
      ) : null}
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {step === 3 ? (
        <ManageMembersStep
          data={data}
          chiefGuestIds={chiefGuestIds}
          onToggleChiefGuest={toggleChiefGuest}
          members={members}
          onScoreChange={updateScore}
        />
      ) : null}

      {step === 4 ? (
        <OpenCategoriesStep candidates={data.openCategoryCandidates} selected={openCategoryIds} onToggle={toggleCategory} onSetAll={setOpenCategoryIds} />
      ) : null}

      {step === 5 ? <NotesStep notesEnabled={notesEnabled} onChange={setNotesEnabled} /> : null}

      {step === 6 ? (
        <ReviewStep
          data={data}
          chapterName={data.chapterName}
          meetingTitle={data.meetingTitle}
          meetingDate={meetingDate}
          chiefGuestIds={chiefGuestIds}
          rankedMembers={preview}
          openCategoryIds={openCategoryIds}
          notesEnabled={notesEnabled}
        />
      ) : null}

      {step === 7 ? <DownloadStep meetingId={data.meetingId} canDownload={canDownload} isSaved={isSaved} dirty={dirty} /> : null}

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <button
          type="button"
          disabled={step === 3}
          onClick={() => setStep((s) => (s > 3 ? ((s - 1) as StepNumber) : s))}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {step === 6 ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Roster"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={step === 7}
            onClick={() => setStep((s) => (s < 7 ? ((s + 1) as StepNumber) : s))}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberDetails({ m }: { m: { name: string; company: string; email: string | null; phone: string | null } }) {
  return (
    <div>
      <p className="font-semibold text-neutral-900">{m.name}</p>
      <p className="text-xs text-neutral-500">{m.company}</p>
      {m.email ? <p className="text-xs text-neutral-500">{m.email}</p> : null}
      {m.phone ? <p className="text-xs text-neutral-500">{m.phone}</p> : null}
    </div>
  );
}

function RoleCards({ title, entries }: { title: string; entries: { memberId: string; memberName: string; roleLabel: string; photoUrl: string | null }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No one assigned yet.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3">
          {entries.map((e) => (
            <div key={e.memberId} className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2">
              {e.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                  {e.memberName.slice(0, 1)}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-neutral-900">{e.memberName}</p>
                <p className="text-xs text-neutral-500">{e.roleLabel}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManageMembersStep({
  data,
  chiefGuestIds,
  onToggleChiefGuest,
  members,
  onScoreChange,
}: {
  data: RosterWizardData;
  chiefGuestIds: string[];
  onToggleChiefGuest: (id: string) => void;
  members: RosterWizardMember[];
  onScoreChange: (memberId: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">1. Chief Guest</h3>
        <p className="mt-1 text-xs text-neutral-500">Feature on this roster&rsquo;s cover — optional, any number.</p>
        {data.chiefGuestCandidates.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No Chief Guests recorded for this chapter yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {data.chiefGuestCandidates.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={chiefGuestIds.includes(g.id)}
                  onChange={() => onToggleChiefGuest(g.id)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                {g.name}
                {g.company ? ` — ${g.company}` : ""}
              </label>
            ))}
          </div>
        )}
      </div>

      <RoleCards title="2. Founding Team" entries={data.foundingTeam} />
      <RoleCards title="3. Leadership Team" entries={data.leadershipTeam} />
      <RoleCards title="4. Coordinators" entries={data.coordinators} />

      <div>
        <h3 className="text-sm font-semibold text-neutral-900">5. All Other Members</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Edit scores, not serial numbers — ranking recalculates automatically when you Save Roster.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">S. No.</th>
                <th className="px-3 py-2 font-medium">Member Details</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Give &amp; Ask</th>
                <th className="px-3 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {members.map((m, i) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 align-top text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2 align-top">
                    <MemberDetails m={m} />
                  </td>
                  <td className="px-3 py-2 align-top text-neutral-600">{m.categoryName}</td>
                  <td className="px-3 py-2 align-top text-neutral-400">
                    <span className="inline-block h-8 w-28 rounded border border-dashed border-neutral-300" aria-hidden />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      value={m.score}
                      onChange={(e) => onScoreChange(m.id, e.target.value)}
                      className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-neutral-500">
                    No other active members in this chapter yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OpenCategoriesStep({
  candidates,
  selected,
  onToggle,
  onSetAll,
}: {
  candidates: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onSetAll: (ids: string[]) => void;
}) {
  const allSelected = candidates.length > 0 && selected.length === candidates.length;
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900">Select Open Categories</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Only the categories checked here will appear on this meeting&rsquo;s roster and PDF.
      </p>
      {candidates.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Every active category is currently occupied in this chapter.</p>
      ) : (
        <>
          <label className="mt-3 flex items-center gap-2 text-sm font-medium text-neutral-900">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onSetAll(allSelected ? [] : candidates.map((c) => c.id))}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Select All
          </label>
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => onToggle(c.id)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                {c.name}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NotesStep({ notesEnabled, onChange }: { notesEnabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900">Configure Notes</h3>
      <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={notesEnabled}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Include a Notes box in the roster sheet
      </label>
      <p className="mt-2 text-xs text-neutral-500">
        {notesEnabled
          ? "One blank Notes box will print after the full member list, before the Guest Self-Introduction section — not a column on every member row."
          : "No Notes box will appear on the roster."}
      </p>
    </div>
  );
}

function ReviewStep({
  data,
  chapterName,
  meetingTitle,
  meetingDate,
  chiefGuestIds,
  rankedMembers,
  openCategoryIds,
  notesEnabled,
}: {
  data: RosterWizardData;
  chapterName: string;
  meetingTitle: string;
  meetingDate: string;
  chiefGuestIds: string[];
  rankedMembers: RosterWizardMember[];
  openCategoryIds: string[];
  notesEnabled: boolean;
}) {
  const chiefGuests = data.chiefGuestCandidates.filter((g) => chiefGuestIds.includes(g.id));
  const categories = data.openCategoryCandidates.filter((c) => openCategoryIds.includes(c.id));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">{chapterName}</h3>
        <p className="text-sm text-neutral-600">
          {meetingTitle} — {meetingDate}
        </p>
      </div>

      <RoleCards
        title="Chief Guest"
        entries={chiefGuests.map((g) => ({ memberId: g.id, memberName: g.name, roleLabel: g.company ?? "", photoUrl: g.photoUrl }))}
      />
      <RoleCards title="Founding Team" entries={data.foundingTeam} />
      <RoleCards title="Leadership Team" entries={data.leadershipTeam} />
      <RoleCards title="Coordinators" entries={data.coordinators} />

      <div>
        <h3 className="text-sm font-semibold text-neutral-900">All Other Members — ranked</h3>
        <p className="mt-1 text-xs text-neutral-500">This is the order Save Roster will persist and the PDF will print.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">S. No.</th>
                <th className="px-3 py-2 font-medium">Member Details</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Give &amp; Ask</th>
                <th className="px-3 py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rankedMembers.map((m, i) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 align-top text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2 align-top">
                    <MemberDetails m={m} />
                  </td>
                  <td className="px-3 py-2 align-top text-neutral-600">{m.categoryName}</td>
                  <td className="px-3 py-2 align-top text-neutral-400">
                    <span className="inline-block h-8 w-28 rounded border border-dashed border-neutral-300" aria-hidden />
                  </td>
                  <td className="px-3 py-2 align-top text-neutral-900">{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Open Categories</h3>
        {categories.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">None selected.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-neutral-700 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <p key={c.id}>• {c.name}</p>
            ))}
          </div>
        )}
      </div>

      {notesEnabled ? (
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Notes</h3>
          <p className="mt-1 text-xs text-neutral-500">One overall notes box, printed before the Guest Self-Introduction section.</p>
          <div className="mt-2 h-24 rounded-lg border border-dashed border-neutral-300 bg-white" aria-hidden />
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">{GUEST_SELF_INTRODUCTION_HEADING}</h3>
        <p className="mt-2 text-sm text-neutral-700">{GUEST_SELF_INTRODUCTION_SALUTATION}</p>
        <p className="mt-1 text-sm text-neutral-600">{GUEST_SELF_INTRODUCTION_INSTRUCTIONS}</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-600">
          {GUEST_SELF_INTRODUCTION_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-neutral-900">{PLEDGE_HEADING}</h3>
        <ul className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-600">
          {PLEDGE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DownloadStep({ meetingId, canDownload, isSaved, dirty }: { meetingId: string; canDownload: boolean; isSaved: boolean; dirty: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-neutral-900">Download PDF</h3>
      {canDownload ? (
        <a
          href={`/api/admin/roster?meetingId=${meetingId}`}
          className="mt-3 inline-block rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Download Roster PDF
        </a>
      ) : (
        <div>
          <button type="button" disabled className="mt-3 cursor-not-allowed rounded-md bg-neutral-300 px-5 py-2.5 text-sm font-medium text-white">
            Download Roster PDF
          </button>
          <p className="mt-2 text-xs text-neutral-500">
            {!isSaved ? "Save the roster (Step 6) before downloading." : dirty ? "You have unsaved changes — save again to update the PDF." : ""}
          </p>
        </div>
      )}
    </div>
  );
}
