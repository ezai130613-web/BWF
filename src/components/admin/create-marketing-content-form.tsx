"use client";

import { useActionState } from "react";
import { createMarketingContent } from "@/app/admin/(dashboard)/marketing/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

/**
 * Brief §4 — upload once, reuse across every platform. Notably no
 * per-platform fields here at all; those live on ScheduledPost, filled in
 * later from this content's own detail page (ScheduleComposer).
 */
export function CreateMarketingContentForm() {
  const [state, formAction, pending] = useActionState(createMarketingContent, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Upload Content</h2>

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
        Internal notes (optional)
        <textarea
          name="notes"
          rows={2}
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
          {pending ? "Uploading…" : "Upload Content"}
        </button>
      </div>
    </form>
  );
}
