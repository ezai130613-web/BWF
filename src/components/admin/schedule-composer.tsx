"use client";

import { useActionState, useState } from "react";
import { createScheduledPosts } from "@/app/admin/(dashboard)/marketing/actions";
import { PLATFORMS, PLATFORM_FIELDS, PLATFORM_LABELS, toIstDateTimeInputs } from "@/lib/marketing/constants";
import type { MarketingPlatform } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

type Entry = {
  caption: string;
  hashtags: string;
  title: string;
  destinationLink: string;
  boardName: string;
  date: string;
  time: string;
  publishNow: boolean;
};

const emptyEntry: Entry = { caption: "", hashtags: "", title: "", destinationLink: "", boardName: "", date: "", time: "", publishNow: false };

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

/**
 * Brief §5-7 — select platforms, configure each independently, Confirm &
 * Schedule. Already-scheduled platforms for this content are excluded from
 * selection (see the parent page's `alreadyScheduled` prop) rather than
 * allowing a duplicate. The parent page keys this component on
 * `alreadyScheduled.join(",")`, so once the server confirms new platforms
 * were saved React remounts this component fresh (clearing all local
 * selection state) instead of reaching for an effect to reset it — the
 * server's own data is the source of truth here, not local optimism.
 */
export function ScheduleComposer({ contentId, alreadyScheduled }: { contentId: string; alreadyScheduled: MarketingPlatform[] }) {
  const [state, formAction, pending] = useActionState(createScheduledPosts, initialState);
  const [selected, setSelected] = useState<Set<MarketingPlatform>>(new Set());
  const [commonCaption, setCommonCaption] = useState("");
  const [entries, setEntries] = useState<Record<MarketingPlatform, Entry>>({
    INSTAGRAM: { ...emptyEntry },
    FACEBOOK: { ...emptyEntry },
    YOUTUBE: { ...emptyEntry },
    PINTEREST: { ...emptyEntry },
  });

  const availablePlatforms = PLATFORMS.filter((p) => !alreadyScheduled.includes(p));

  function togglePlatform(p: MarketingPlatform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function updateEntry(p: MarketingPlatform, patch: Partial<Entry>) {
    setEntries((prev) => ({ ...prev, [p]: { ...prev[p], ...patch } }));
  }

  function applyCommonCaption() {
    setEntries((prev) => {
      const next = { ...prev };
      for (const p of selected) next[p] = { ...next[p], caption: commonCaption };
      return next;
    });
  }

  function buildPayload() {
    const now = toIstDateTimeInputs(new Date());
    return JSON.stringify({
      contentId,
      posts: Array.from(selected).map((platform) => {
        const e = entries[platform];
        return {
          platform,
          caption: e.caption,
          hashtags: e.hashtags,
          title: e.title,
          destinationLink: e.destinationLink,
          boardName: e.boardName,
          date: e.publishNow ? now.date : e.date,
          time: e.publishNow ? now.time : e.time,
        };
      }),
    });
  }

  if (availablePlatforms.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
        This content is already scheduled to every platform. Cancel an existing schedule below to reschedule it elsewhere.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-neutral-900">Schedule Posts</h2>

      <div className="flex flex-wrap gap-4">
        {availablePlatforms.map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" checked={selected.has(p)} onChange={() => togglePlatform(p)} />
            {PLATFORM_LABELS[p]}
          </label>
        ))}
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            Common caption (optional — a starting point for every selected platform)
            <textarea rows={2} value={commonCaption} onChange={(e) => setCommonCaption(e.target.value)} className={inputClass} />
          </label>
          <button
            type="button"
            onClick={applyCommonCaption}
            className="self-start text-xs font-medium text-neutral-600 underline hover:text-neutral-900"
          >
            Apply to all selected platforms below
          </button>
        </div>
      ) : null}

      {Array.from(selected).map((platform) => {
        const fields = PLATFORM_FIELDS[platform];
        const entry = entries[platform];
        return (
          <div key={platform} className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
            <h3 className="text-sm font-semibold text-neutral-900">{PLATFORM_LABELS[platform]}</h3>
            <p className="text-xs text-neutral-500">{fields.formatNote}</p>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              {fields.captionLabel}
              <textarea
                rows={2}
                value={entry.caption}
                onChange={(e) => updateEntry(platform, { caption: e.target.value })}
                className={inputClass}
              />
            </label>

            {fields.hasHashtags ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                Hashtags
                <input
                  value={entry.hashtags}
                  onChange={(e) => updateEntry(platform, { hashtags: e.target.value })}
                  placeholder="#bwf #construction"
                  className={inputClass}
                />
              </label>
            ) : null}

            {fields.hasTitle ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                {fields.titleLabel}
                <input value={entry.title} onChange={(e) => updateEntry(platform, { title: e.target.value })} className={inputClass} />
              </label>
            ) : null}

            {fields.hasDestinationLink ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                Destination link
                <input
                  type="url"
                  value={entry.destinationLink}
                  onChange={(e) => updateEntry(platform, { destinationLink: e.target.value })}
                  className={inputClass}
                />
              </label>
            ) : null}

            {fields.hasBoard ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                Board
                <input
                  value={entry.boardName}
                  onChange={(e) => updateEntry(platform, { boardName: e.target.value })}
                  placeholder="Board name — a live picker arrives once Pinterest is connected"
                  className={inputClass}
                />
              </label>
            ) : null}

            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input type="checkbox" checked={entry.publishNow} onChange={(e) => updateEntry(platform, { publishNow: e.target.checked })} />
              Publish Now
            </label>

            {!entry.publishNow ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                  Date (IST)
                  <input type="date" value={entry.date} onChange={(e) => updateEntry(platform, { date: e.target.value })} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                  Time (IST)
                  <input type="time" value={entry.time} onChange={(e) => updateEntry(platform, { time: e.target.value })} className={inputClass} />
                </label>
              </div>
            ) : null}
          </div>
        );
      })}

      <input type="hidden" name="payload" value={buildPayload()} />

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending || selected.size === 0}
        className="self-start rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Scheduling…" : "Confirm & Schedule"}
      </button>
    </form>
  );
}
