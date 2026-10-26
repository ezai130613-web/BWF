"use client";

import { useActionState, useEffect, useRef } from "react";

type State = { error?: string; success?: boolean };
const initialState: State = {};

/**
 * Adds one admin remark. The server action decides what the remark is
 * attached to from the hidden fields; `contexts` (when given) lets the admin
 * pick whether it's a renewal or general remark.
 */
export function AddRemarkForm({
  action,
  hiddenFields,
  contexts,
  placeholder = "e.g. renewal discussed with Head Table, attendance concerns, payment arrangements…",
  submitLabel = "Add remark",
}: {
  action: (prevState: State | undefined, formData: FormData) => Promise<State>;
  hiddenFields: Record<string, string>;
  contexts?: { value: string; label: string }[];
  placeholder?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {contexts ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Type
          <select name="context" defaultValue={contexts[0]?.value} className="w-fit rounded-lg border border-neutral-300 px-2 py-1.5 text-sm">
            {contexts.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <textarea
        name="body"
        rows={3}
        required
        maxLength={2000}
        placeholder={placeholder}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
      />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
