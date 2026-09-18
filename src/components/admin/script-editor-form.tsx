"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { createScript, deleteScript, duplicateScript, updateScript } from "@/app/admin/(dashboard)/marketing/scripts/actions";
import {
  CONTENT_FORMATS,
  CONTENT_FORMAT_LABELS,
  SCRIPT_STATUSES,
  SCRIPT_STATUS_LABELS,
  formatScriptNumber,
} from "@/lib/marketing/constants";
import type { ContentFormat, ScriptStatus } from "@/generated/prisma/client";

const initialState: { error?: string } = {};
const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export type MarketingScriptRow = {
  id: string;
  scriptNumber: number;
  title: string;
  topic: string | null;
  contentType: ContentFormat;
  content: string;
  status: ScriptStatus;
  updatedAt: Date;
};

/**
 * Client spec §5B — the script editor, shared by "+ Create New Script",
 * clicking a saved script to reopen it, and "Save as Script" on an AI reply
 * (via `draft`, pre-filling content/title without creating anything until
 * the admin actually saves).
 */
export function ScriptEditorForm({
  script,
  draft,
  onDone,
}: {
  script?: MarketingScriptRow;
  draft?: { title: string; content: string };
  onDone: () => void;
}) {
  const isEdit = Boolean(script);
  const [state, formAction, pending] = useActionState(isEdit ? updateScript : createScript, initialState);
  const [actionPending, startTransition] = useTransition();

  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onDone();
    wasPending.current = pending;
  }, [pending, state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={script!.id} /> : null}

      {isEdit ? <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{formatScriptNumber(script!.scriptNumber)}</p> : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Script title
        <input name="title" required defaultValue={script?.title ?? draft?.title ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Topic
        <input name="topic" defaultValue={script?.topic ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Content type
        <select name="contentType" defaultValue={script?.contentType ?? "REEL"} className={inputClass}>
          {CONTENT_FORMATS.map((f) => (
            <option key={f} value={f}>
              {CONTENT_FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Script content
        <textarea
          name="content"
          rows={12}
          required
          defaultValue={script?.content ?? draft?.content ?? ""}
          className={`${inputClass} font-mono text-[13px]`}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Status
        <select name="status" defaultValue={script?.status ?? "DRAFT"} className={inputClass}>
          {SCRIPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SCRIPT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Saving…" : isEdit ? "Save changes" : "Save script"}
          </button>
          <button type="button" onClick={onDone} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700">
            Cancel
          </button>
        </div>

        {isEdit ? (
          <div className="flex gap-3">
            <button
              type="button"
              disabled={actionPending}
              onClick={() => startTransition(async () => { await duplicateScript(script!.id); onDone(); })}
              className="text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={actionPending}
              onClick={() => {
                if (!confirm("Delete this script? This can't be undone.")) return;
                startTransition(async () => { await deleteScript(script!.id); onDone(); });
              }}
              className="text-sm text-red-600 underline hover:text-red-800 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}
