"use client";

import { useActionState } from "react";
import { createMarketingContent } from "@/app/admin/(dashboard)/marketing/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

/**
 * Script Writing & Content Creation (2026-09-18) — brief §4's "upload once"
 * plus a real place to write the caption/script alongside it, rather than
 * only at scheduling time. `script` pre-fills the Scheduling & Posting
 * composer's common-caption field (see ScheduleComposer's `initialScript`
 * prop) — written once here, reused there, still fully editable per
 * platform. No per-platform fields on this page itself; those stay on
 * ScheduledPost, filled in on the next screen this redirects to.
 */
export function CreateMarketingContentForm() {
  const [state, formAction, pending] = useActionState(createMarketingContent, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Title
        <input
          name="title"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <div className="sm:col-span-2">
        <MediaUploadField
          label="Video"
          name="videoUrl"
          kind="marketingVideo"
          helperText="MP4 or MOV. The system checks each selected platform's own requirements when you schedule this content — see the format note under each platform."
        />
      </div>

      <div className="sm:col-span-2">
        <MediaUploadField label="Thumbnail / cover image (optional)" name="thumbnailUrl" kind="image" />
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Script / caption
        <textarea
          name="script"
          rows={5}
          placeholder="Write the caption or script for this post — you'll be able to fine-tune it per platform on the next screen."
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Internal notes (optional)
        <textarea
          name="notes"
          rows={2}
          placeholder="Not shown publicly — for your own team's reference."
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save & Continue to Scheduling"}
        </button>
      </div>
    </form>
  );
}
