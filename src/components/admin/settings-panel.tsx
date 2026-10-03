"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import {
  addFeedbackRecipient,
  removeFeedbackRecipient,
  setFeedbackRecipientEnabled,
  toggleSetting,
} from "@/app/admin/(dashboard)/settings/actions";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-700" : "bg-neutral-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsPanel({
  notifySuperAdmins,
  requireEmailCode,
  defaults,
  extras,
}: {
  notifySuperAdmins: boolean;
  requireEmailCode: boolean;
  defaults: { name: string; email: string }[];
  extras: { id: string; email: string; isEnabled: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [addState, addAction, adding] = useActionState(addFeedbackRecipient, {} as { error?: string; ok?: boolean });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState?.ok) formRef.current?.reset();
  }, [addState]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Visitor Feedback Email Recipients</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Every feedback submission is saved in the Admin Panel first, then emailed to the recipients switched on
          here. An email failure never affects the visitor&rsquo;s submission.
        </p>

        <ul className="mt-4 divide-y divide-neutral-100 rounded-md border border-neutral-200">
          <li className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">Default — Super Admin</p>
              <p className="truncate text-xs text-neutral-500">
                {defaults.length > 0 ? defaults.map((d) => `${d.name} <${d.email}>`).join(", ") : "No active Super Admin email found"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">{notifySuperAdmins ? "ON" : "OFF"}</span>
              <Switch
                label="Default Super Admin recipient"
                checked={notifySuperAdmins}
                disabled={pending}
                onChange={(v) => startTransition(() => toggleSetting("feedback.notifySuperAdmins", v))}
              />
            </div>
          </li>
          {extras.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="min-w-0 truncate text-sm text-neutral-900">{r.email}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">{r.isEnabled ? "ON" : "OFF"}</span>
                <Switch
                  label={`Recipient ${r.email}`}
                  checked={r.isEnabled}
                  disabled={pending}
                  onChange={(v) => startTransition(() => setFeedbackRecipientEnabled(r.id, v))}
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Remove ${r.email}?`)) startTransition(() => removeFeedbackRecipient(r.id));
                  }}
                  className="text-xs text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form ref={formRef} action={addAction} className="mt-4 flex flex-wrap items-start gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-72 max-w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add recipient"}
          </button>
          {addState?.error ? <p className="w-full text-sm text-red-600">{addState.error}</p> : null}
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Member first-login email verification</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600">
              When ON, a member signing in with temporary credentials must confirm their email with a 6-digit code
              before setting their own password. Turn OFF only if email delivery isn&rsquo;t working — members then
              just type their email (it&rsquo;s saved unverified).
            </p>
          </div>
          <Switch
            label="Require email verification code"
            checked={requireEmailCode}
            disabled={pending}
            onChange={(v) => startTransition(() => toggleSetting("memberActivation.requireEmailCode", v))}
          />
        </div>
      </section>
    </div>
  );
}
