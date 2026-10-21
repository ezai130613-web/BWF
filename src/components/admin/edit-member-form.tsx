"use client";

import { LocationPickerField } from "@/components/maps/location-picker-field";

import { useActionState, useState } from "react";
import { updateMemberProfile } from "@/app/admin/(dashboard)/members/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import type { Member } from "@/generated/prisma/client";
import type { GalleryEntry } from "@/lib/members/profile-fields";

const initialState: { error?: string } = {};

function GalleryList({
  label,
  kind,
  entries,
  onChange,
}: {
  label: string;
  kind: "image" | "video";
  entries: GalleryEntry[];
  onChange: (next: GalleryEntry[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      <h3 className="text-sm font-semibold text-neutral-900">{label}</h3>
      {entries.map((entry, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-neutral-200 p-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <MediaUploadField
              label={`${label} #${i + 1}`}
              name={`__${kind}_${i}`}
              kind={kind}
              defaultValue={entry.url}
              onValueChange={(url) => {
                const next = [...entries];
                next[i] = { ...next[i], url };
                onChange(next);
              }}
            />
            <input
              placeholder="Caption (optional)"
              value={entry.caption ?? ""}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], caption: e.target.value };
                onChange(next);
              }}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
            className="self-start text-sm text-neutral-500 hover:text-emerald-800"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...entries, { url: "", caption: "" }])}
        className="self-start text-sm text-neutral-500 hover:text-emerald-800"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  );
}

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
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue ?? ""}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
        />
      )}
    </label>
  );
}

export function EditMemberForm({ member }: { member: Member }) {
  const [state, formAction, pending] = useActionState(updateMemberProfile, initialState);
  const [photos, setPhotos] = useState<GalleryEntry[]>(
    Array.isArray(member.photos) ? (member.photos as GalleryEntry[]) : [],
  );
  const [videos, setVideos] = useState<GalleryEntry[]>(
    Array.isArray(member.videos) ? (member.videos as GalleryEntry[]) : [],
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="memberId" value={member.id} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="videos" value={JSON.stringify(videos)} />

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Personal</h2>
        <Field label="Name" name="name" defaultValue={member.name} />
        <Field label="Designation" name="designation" defaultValue={member.designation} />
        <Field label="Bio" name="bio" defaultValue={member.bio} textarea />
        <MediaUploadField label="Photo" name="photoUrl" kind="image" defaultValue={member.photoUrl} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
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

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Contact</h2>
        <Field label="Email" name="email" type="email" defaultValue={member.email} />
        <Field label="Phone" name="phone" defaultValue={member.phone} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={member.whatsapp} />
        <Field label="Website" name="website" type="url" defaultValue={member.website} />
        <Field label="Address" name="address" defaultValue={member.address} />
        <Field label="Google Maps URL" name="googleMapsUrl" type="url" defaultValue={member.googleMapsUrl} />
        <LocationPickerField defaultLabel={member.locationLabel} defaultLat={member.latitude} defaultLng={member.longitude} />
      </section>

      <section className="grid gap-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Social & media</h2>
        <Field label="Instagram URL" name="instagramUrl" type="url" defaultValue={member.instagramUrl} />
        <Field label="LinkedIn URL" name="linkedinUrl" type="url" defaultValue={member.linkedinUrl} />
        <Field label="Facebook URL" name="facebookUrl" type="url" defaultValue={member.facebookUrl} />
        <Field label="YouTube URL" name="youtubeUrl" type="url" defaultValue={member.youtubeUrl} />
        <MediaUploadField label="Brochure (PDF)" name="brochureUrl" kind="pdf" defaultValue={member.brochureUrl} />
        <MediaUploadField
          label="Video"
          name="videoUrl"
          kind="video"
          defaultValue={member.videoUrl}
          helperText="Upload a file, or paste a Google Drive link — no YouTube/Instagram embeds (brief §47)."
        />
      </section>

      <section className="grid gap-6 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-6 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-neutral-900 sm:col-span-2">Gallery</h2>
        <GalleryList label="Photo" kind="image" entries={photos} onChange={setPhotos} />
        <GalleryList label="Video" kind="video" entries={videos} onChange={setVideos} />
      </section>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
