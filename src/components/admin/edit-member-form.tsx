"use client";

import { useActionState } from "react";
import { updateMemberProfile } from "@/app/admin/(dashboard)/members/actions";
import type { Member } from "@/generated/prisma/client";

const initialState: { error?: string } = {};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  textarea = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {textarea ? (
        <textarea
          name={name}
          rows={3}
          defaultValue={defaultValue ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      )}
    </label>
  );
}

export function EditMemberForm({ member }: { member: Member }) {
  const [state, formAction, pending] = useActionState(updateMemberProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="memberId" value={member.id} />

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Personal</h2>
        <Field label="Name" name="name" defaultValue={member.name} />
        <Field label="Designation" name="designation" defaultValue={member.designation} />
        <Field label="Bio" name="bio" defaultValue={member.bio} textarea />
        <Field label="Photo URL" name="photoUrl" defaultValue={member.photoUrl} />
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">
          Business profile
        </h2>
        <Field label="Services" name="services" defaultValue={member.services} textarea />
        <Field label="Specialisations" name="specialisations" defaultValue={member.specialisations} textarea />
        <Field label="USP" name="usp" defaultValue={member.usp} textarea />
        <Field label="Years in business" name="yearsInBusiness" type="number" defaultValue={member.yearsInBusiness} />
        <Field label="Areas served" name="areasServed" defaultValue={member.areasServed} />
        <Field label="Certifications" name="certifications" defaultValue={member.certifications} />
        <Field label="Major projects" name="majorProjects" defaultValue={member.majorProjects} textarea />
        <Field label="Clientele" name="clientele" defaultValue={member.clientele} textarea />
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Contact</h2>
        <Field label="Email" name="email" type="email" defaultValue={member.email} />
        <Field label="Phone" name="phone" defaultValue={member.phone} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={member.whatsapp} />
        <Field label="Website" name="website" type="url" defaultValue={member.website} />
        <Field label="Address" name="address" defaultValue={member.address} />
        <Field label="Google Maps URL" name="googleMapsUrl" type="url" defaultValue={member.googleMapsUrl} />
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Social & media</h2>
        <Field label="Instagram URL" name="instagramUrl" type="url" defaultValue={member.instagramUrl} />
        <Field label="LinkedIn URL" name="linkedinUrl" type="url" defaultValue={member.linkedinUrl} />
        <Field label="Facebook URL" name="facebookUrl" type="url" defaultValue={member.facebookUrl} />
        <Field label="Brochure URL (PDF)" name="brochureUrl" type="url" defaultValue={member.brochureUrl} />
        <Field
          label="Video URL (direct file or Google Drive only — no YouTube/Instagram, brief §47)"
          name="videoUrl"
          type="url"
          defaultValue={member.videoUrl}
        />
      </section>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
