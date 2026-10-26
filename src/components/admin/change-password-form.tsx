"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { changeOwnPassword } from "@/app/admin/(dashboard)/account/actions";
import { PasswordInput } from "@/components/ui/password-input";

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await changeOwnPassword({ currentPassword, password, confirmPassword });
      if (result.error || !result.identifier) {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      // Every session (this one included) was just revoked server-side;
      // sign straight back in with the new password.
      const signInResult = await signIn("admin-login", { email: result.identifier, password, redirect: false });
      if (signInResult?.error) {
        router.push("/admin/login");
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="current-password" className="text-sm font-medium text-neutral-800">
          Current password
        </label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-sm font-medium text-neutral-800">
          New password
        </label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          minLength={4}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500">At least 4 characters.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium text-neutral-800">
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {done ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Password changed. Any other devices signed in to this account have been signed out.
        </p>
      ) : null}
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
