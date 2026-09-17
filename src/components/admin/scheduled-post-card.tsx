"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelScheduledPost, retryScheduledPost, updateScheduledPost } from "@/app/admin/(dashboard)/marketing/actions";
import { PLATFORM_FIELDS, PLATFORM_LABELS, STATUS_BADGE_CLASSES, STATUS_LABELS, formatIst, toIstDateTimeInputs } from "@/lib/marketing/constants";
import type { MarketingPlatform, ScheduledPostStatus } from "@/generated/prisma/client";

const initialState: { error?: string } = {};
const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

export type ScheduledPostRow = {
  id: string;
  platform: MarketingPlatform;
  status: ScheduledPostStatus;
  caption: string | null;
  hashtags: string | null;
  title: string | null;
  destinationLink: string | null;
  boardId: string | null;
  boardName: string | null;
  scheduledFor: Date;
  publishedUrl: string | null;
  lastError: string | null;
};

/** Brief §9 — edit or cancel a scheduled post before it publishes; §8 — Retry for a failed one. */
export function ScheduledPostCard({ post }: { post: ScheduledPostRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateScheduledPost, initialState);
  const [actionPending, startTransition] = useTransition();
  const editable = post.status !== "PUBLISHING" && post.status !== "PUBLISHED";
  const fields = PLATFORM_FIELDS[post.platform];
  const ist = toIstDateTimeInputs(post.scheduledFor);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{PLATFORM_LABELS[post.platform]}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[post.status]}`}>
            {STATUS_LABELS[post.status]}
          </span>
        </div>
        <span className="text-xs text-neutral-500">{formatIst(post.scheduledFor)}</span>
      </div>

      {post.caption ? <p className="text-sm text-neutral-700">{post.caption}</p> : null}
      {post.publishedUrl ? (
        <a href={post.publishedUrl} target="_blank" rel="noreferrer" className="text-sm text-emerald-700 underline">
          View published post →
        </a>
      ) : null}
      {post.lastError ? <p className="text-sm text-red-600">{post.lastError}</p> : null}

      {editing && editable ? (
        <form action={formAction} className="flex flex-col gap-3 rounded-md bg-neutral-50 p-3">
          <input type="hidden" name="scheduledPostId" value={post.id} />

          <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
            {fields.captionLabel}
            <textarea name="caption" rows={2} defaultValue={post.caption ?? ""} className={inputClass} />
          </label>

          {fields.hasHashtags ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Hashtags
              <input name="hashtags" defaultValue={post.hashtags ?? ""} className={inputClass} />
            </label>
          ) : null}

          {fields.hasTitle ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              {fields.titleLabel}
              <input name="title" defaultValue={post.title ?? ""} className={inputClass} />
            </label>
          ) : null}

          {fields.hasDestinationLink ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Destination link
              <input name="destinationLink" type="url" defaultValue={post.destinationLink ?? ""} className={inputClass} />
            </label>
          ) : null}

          {fields.hasBoard ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Board
              <input name="boardName" defaultValue={post.boardName ?? ""} className={inputClass} />
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Date (IST)
              <input name="date" type="date" defaultValue={ist.date} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Time (IST)
              <input name="time" type="time" defaultValue={ist.time} className={inputClass} />
            </label>
          </div>

          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              onClick={() => !pending && setEditing(false)}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700">
              Cancel edit
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          {editable ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-neutral-600 underline hover:text-neutral-900">
              Edit
            </button>
          ) : null}
          {post.status === "DRAFT" || post.status === "SCHEDULED" ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => {
                if (!confirm("Cancel this scheduled post? This can't be undone.")) return;
                startTransition(async () => {
                  await cancelScheduledPost(post.id);
                });
              }}
              className="text-sm text-red-600 underline hover:text-red-800 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}
          {post.status === "FAILED" || post.status === "ACTION_REQUIRED" ? (
            <button
              type="button"
              disabled={actionPending}
              onClick={() => {
                startTransition(async () => {
                  await retryScheduledPost(post.id);
                });
              }}
              className="text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
            >
              Retry
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
