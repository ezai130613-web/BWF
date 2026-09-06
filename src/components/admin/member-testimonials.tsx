"use client";

import { useActionState } from "react";
import { createTestimonialDirect, setTestimonialStatus, toggleTestimonialFeatured } from "@/app/admin/(dashboard)/testimonials/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import type { Testimonial } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

/**
 * Phase 17 — a member-scoped testimonials/success-stories panel, added to
 * the member's own admin edit page. Reuses the exact server actions
 * /admin/testimonials already has (a testimonial row IS the model for both
 * "testimonial" and "success story" — differentiated only by `type`), just
 * pre-scoped to this one member instead of listing every testimonial site-wide.
 */
export function MemberTestimonials({ memberId, testimonials }: { memberId: string; testimonials: Testimonial[] }) {
  const [state, formAction, pending] = useActionState(createTestimonialDirect, initialState);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-neutral-900">Testimonials & success stories</h2>

      {testimonials.length > 0 ? (
        <div className="flex flex-col gap-3">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-md border border-neutral-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                <span className="text-xs text-neutral-500">{t.type.replace("_", " ")}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-700">&ldquo;{t.content}&rdquo;</p>
              <p className="mt-1 text-xs text-neutral-500">{t.name}{t.role || t.company ? ` · ${[t.role, t.company].filter(Boolean).join(" · ")}` : ""}</p>
              <div className="mt-2 flex gap-4">
                {t.status !== "APPROVED" ? (
                  <form action={setTestimonialStatus.bind(null, t.id, "APPROVED")}>
                    <button type="submit" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">Approve</button>
                  </form>
                ) : null}
                {t.status !== "REJECTED" ? (
                  <form action={setTestimonialStatus.bind(null, t.id, "REJECTED")}>
                    <button type="submit" className="text-sm text-red-600 hover:text-red-800">Reject</button>
                  </form>
                ) : null}
                {t.status === "APPROVED" ? (
                  <form action={toggleTestimonialFeatured.bind(null, t.id)}>
                    <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                      {t.featured ? "Unfeature" : "Feature"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      )}

      <form action={formAction} className="grid gap-4 rounded-md border border-neutral-200 p-4 sm:grid-cols-2">
        <h3 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Add for this member (publishes immediately)</h3>
        <input type="hidden" name="memberId" value={memberId} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Name (who it&apos;s from)
          <input name="name" required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Type
          <select name="type" required defaultValue="MEMBER" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
            <option value="MEMBER">Member</option>
            <option value="CLIENT">Client</option>
            <option value="VIDEO">Video</option>
            <option value="SUCCESS_STORY">Success Story</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Company (optional)
          <input name="company" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Role (optional)
          <input name="role" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
          Content
          <textarea name="content" rows={3} required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
        </label>
        <MediaUploadField label="Photo (optional)" name="imageUrl" kind="image" />
        <MediaUploadField label="Video (optional)" name="videoUrl" kind="video" helperText="For a Video-type testimonial." />
        <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
          <input type="checkbox" name="consent" className="h-4 w-4" />
          Confirmed with the person that this can be displayed publicly
        </label>
        {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
            {pending ? "Adding…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
