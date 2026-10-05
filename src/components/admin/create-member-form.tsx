"use client";

import { useActionState, useState } from "react";
import { createMember, type CreateMemberState } from "@/app/admin/(dashboard)/members/actions";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import { normalizeCompanyName } from "@/lib/companies/normalize";

const initialState: CreateMemberState = {};

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

type CompanyOption = { id: string; name: string; gstNumber: string | null };

/**
 * 2026-10-05 client correction: the company is typed here instead of being
 * created on the Companies page first. A name matching an existing company
 * (same normalization as the server's duplicate check — case, punctuation,
 * "Pvt Ltd" etc. ignored) links the member to it and says so; anything else
 * opens the new-company fields and is created together with the member.
 */
function CompanyFields({ companies }: { companies: CompanyOption[] }) {
  const [query, setQuery] = useState("");
  const key = normalizeCompanyName(query);
  const match = key ? companies.find((c) => normalizeCompanyName(c.name) === key) : undefined;
  const isNew = Boolean(key) && !match;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 sm:col-span-2">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Company
        <input
          name="companyName"
          required
          list="member-company-options"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search, or enter a new company"
          className={`${inputClass} bg-white`}
        />
        <datalist id="member-company-options">
          {companies.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </label>

      {match ? (
        <>
          <input type="hidden" name="companyId" value={match.id} />
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            &ldquo;{match.name}&rdquo; already exists — this member will be added to it (no duplicate is created).
            {match.gstNumber ? <> GST: <span className="font-mono">{match.gstNumber}</span></> : null}
          </p>
          {match.gstNumber ? null : (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:max-w-sm">
              GST number (optional)
              <input name="companyGstNumber" placeholder="29ABCDE1234F1Z5" className={`${inputClass} bg-white uppercase`} />
              <span className="text-xs font-normal text-neutral-500">Saved to the company — it doesn&rsquo;t have one yet.</span>
            </label>
          )}
        </>
      ) : null}

      {isNew ? (
        <>
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            New company — it will be created along with this member.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              GST number (optional)
              <input name="companyGstNumber" placeholder="29ABCDE1234F1Z5" className={`${inputClass} bg-white uppercase`} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
              Website (optional)
              <input name="companyWebsite" type="url" placeholder="https://" className={`${inputClass} bg-white`} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
              Company description (optional)
              <textarea name="companyDescription" rows={2} className={`${inputClass} bg-white`} />
            </label>
            <div className="sm:col-span-2">
              <MediaUploadField label="Company logo (optional)" name="companyLogoUrl" kind="image" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CreateMemberForm({
  chapters,
  categories,
  companies,
  members,
}: {
  chapters: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  companies: CompanyOption[];
  members: { id: string; name: string; chapterName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createMember, initialState);

  return (
    // Remounted after each successful add so the typed company and uploads clear.
    <form
      key={state.savedAt ?? "new"}
      action={formAction}
      className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-2"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Name
        <input
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Designation
        <input
          name="designation"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input
          name="email"
          type="email"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Phone
        <input
          name="phone"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      <div className="sm:col-span-2">
        <MediaUploadField label="Photograph (optional)" name="photoUrl" kind="image" />
      </div>
      <CompanyFields companies={companies} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Chapter
        <select
          name="chapterId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select…</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Category
        <select
          name="categoryId"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
        Referred by (optional)
        <select
          name="referredByMemberId"
          defaultValue=""
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        >
          <option value="">No inductor recorded</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {m.chapterName}
            </option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          If another member invited them to join, select who — they get the induction credit.
        </span>
      </label>

      {state?.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state?.savedAt ? <p className="text-sm text-emerald-700 sm:col-span-2">Member added.</p> : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}
