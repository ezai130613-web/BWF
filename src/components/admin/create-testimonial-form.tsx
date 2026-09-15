"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { createTestimonialDirect } from "@/app/admin/(dashboard)/testimonials/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";

const initialState: { error?: string } = {};

type MemberOption = {
  id: string;
  name: string;
  designation: string | null;
  company: { name: string } | null;
};

export function CreateTestimonialForm({
  chapters,
  members,
}: {
  chapters: { id: string; name: string }[];
  members: MemberOption[];
}) {
  const [state, formAction, pending] = useActionState(createTestimonialDirect, initialState);
  const nameRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);

  function handleMemberSelect(memberId: string) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (nameRef.current) nameRef.current.value = member.name;
    if (companyRef.current) companyRef.current.value = member.company?.name ?? "";
    if (roleRef.current) roleRef.current.value = member.designation ?? "";
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
      <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">
        Add testimonial directly (publishes immediately)
      </h2>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Member (optional — auto-fills name/company/role below)
        <select
          name="memberId"
          defaultValue=""
          onChange={(e) => handleMemberSelect(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">None (not linked to a member)</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          ref={nameRef}
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Type
        <select name="type" required defaultValue="MEMBER" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
          <option value="MEMBER">Member</option>
          <option value="VISITOR">Visitor</option>
          <option value="CLIENT">Client</option>
          <option value="VIDEO">Video</option>
          <option value="SUCCESS_STORY">Success Story</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company (optional)
        <input ref={companyRef} name="company" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Role (optional)
        <input ref={roleRef} name="role" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Chapter (optional)
        <select name="chapterId" className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none">
          <option value="">None</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Testimonial
        <textarea name="content" rows={3} required className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none" />
      </label>
      <MediaUploadField label="Photo (optional)" name="imageUrl" kind="image" />
      <MediaUploadField
        label="Video (optional)"
        name="videoUrl"
        kind="video"
        helperText="For a Video-type testimonial — upload a file or paste a Google Drive link."
      />
      <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
        <input type="checkbox" name="consent" className="h-4 w-4" />
        Confirmed with the person that this can be displayed publicly
      </label>
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
          {pending ? "Adding…" : "Publish testimonial"}
        </button>
      </div>
    </form>
  );
}
