"use client";

import { useActionState } from "react";
import { reviewMemberProfileRevision } from "@/app/admin/(dashboard)/members/actions";
import { MEMBER_PROFILE_FIELD_LABELS, type MemberProfileFields } from "@/lib/members/profile-fields";

const initialState: { error?: string } = {};

const FIELD_ORDER: (keyof MemberProfileFields)[] = [
  "name",
  "designation",
  "bio",
  "email",
  "phone",
  "services",
  "specialisations",
  "usp",
  "yearsInBusiness",
  "areasServed",
  "certifications",
  "majorProjects",
  "clientele",
  "whatsapp",
  "website",
  "address",
  "googleMapsUrl",
  "instagramUrl",
  "linkedinUrl",
  "facebookUrl",
  "photoUrl",
  "brochureUrl",
  "videoUrl",
];

const TEXTAREA_FIELDS = new Set(["bio", "services", "specialisations", "usp", "majorProjects", "clientele"]);

/**
 * Brief §20's three review options in one form: Reject leaves the fields
 * alone; Approve applies whatever's currently in the fields — unedited,
 * that's a plain Approve, edited first, that's "Edit and Approve". Each
 * field shows the member's proposed value pre-filled, with the currently-
 * published value alongside it when they differ, so admin can see what's
 * actually changing without leaving the form.
 */
export function ReviewProfileRevisionForm({
  revisionId,
  proposed,
  current,
}: {
  revisionId: string;
  proposed: Record<string, unknown>;
  current: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(reviewMemberProfileRevision, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-amber-300 bg-amber-50/40 p-6">
      <input type="hidden" name="revisionId" value={revisionId} />
      <h2 className="text-sm font-semibold text-neutral-900">Pending edit request</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELD_ORDER.map((field) => {
          const proposedValue = proposed[field] ?? "";
          const currentValue = current[field] ?? "";
          const changed = String(proposedValue) !== String(currentValue ?? "");
          return (
            <label key={field} className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              {MEMBER_PROFILE_FIELD_LABELS[field]}
              {changed && currentValue ? (
                <span className="text-xs font-normal text-neutral-500 line-through">{String(currentValue)}</span>
              ) : null}
              {TEXTAREA_FIELDS.has(field) ? (
                <textarea
                  name={field}
                  rows={3}
                  defaultValue={String(proposedValue)}
                  className={`rounded-md border px-3 py-2 text-sm text-neutral-900 focus:outline-none ${changed ? "border-amber-400 bg-white" : "border-neutral-300"}`}
                />
              ) : (
                <input
                  name={field}
                  type={field === "yearsInBusiness" ? "number" : "text"}
                  defaultValue={String(proposedValue)}
                  className={`rounded-md border px-3 py-2 text-sm text-neutral-900 focus:outline-none ${changed ? "border-amber-400 bg-white" : "border-neutral-300"}`}
                />
              )}
            </label>
          );
        })}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Review notes (optional, internal)
        <textarea
          name="reviewNotes"
          rows={2}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>

      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          name="intent"
          value="approve"
          disabled={pending}
          className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="submit"
          name="intent"
          value="reject"
          disabled={pending}
          className="rounded-md border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
