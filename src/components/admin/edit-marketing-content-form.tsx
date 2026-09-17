"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateMarketingContent } from "@/app/admin/(dashboard)/marketing/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export type EditableMarketingContent = {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  script: string | null;
  notes: string | null;
};

/** Lets the admin revise title/script/thumbnail/notes after creation — Batch 1 only ever supported create. */
export function EditMarketingContentForm({ content }: { content: EditableMarketingContent }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateMarketingContent, initialState);

  // See ScheduledPostCard's identical comment — close only once the save
  // genuinely completes, not from the submit button's own onClick (which
  // fires before the action starts and would unmount the form mid-submit).
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) setEditing(false);
    wasPending.current = pending;
  }, [pending, state]);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="self-start text-sm text-neutral-600 underline hover:text-neutral-900">
        Edit details
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="contentId" value={content.id} />
      <input type="hidden" name="videoUrl" value={content.videoUrl} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Title
        <input name="title" required defaultValue={content.title} className={inputClass} />
      </label>

      <MediaUploadField label="Thumbnail / cover image" name="thumbnailUrl" kind="image" defaultValue={content.thumbnailUrl} />

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Script / caption
        <textarea name="script" rows={4} defaultValue={content.script ?? ""} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Internal notes
        <textarea name="notes" rows={2} defaultValue={content.notes ?? ""} className={inputClass} />
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
