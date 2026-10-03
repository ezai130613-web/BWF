"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Single-step (email + password) login UI shared by both /admin/login and
 * /member/login — only the NextAuth provider id and where a successful login
 * lands differ. Replaces the old two-step (password, then OTP) OtpLoginForm
 * per the Sept 2026 client correction removing the verification-code step.
 */
export function LoginForm({
  providerId,
  defaultRedirectTo,
  forgotPasswordUrl,
  memberVariant = false,
}: {
  providerId: string;
  defaultRedirectTo: string;
  forgotPasswordUrl: string;
  /** Member portal (2026-10-03): accepts a temporary username as well as an
   * email, offers "Keep me signed in", and uses the green portal styling. */
  memberVariant?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? defaultRedirectTo;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await signIn(providerId, {
        email,
        password,
        ...(memberVariant ? { remember: remember ? "true" : "false" } : {}),
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.code === "account-locked"
            ? "Too many failed attempts. Try again later."
            : memberVariant
              ? "Invalid username/email or password."
              : "Invalid email or password.",
        );
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = memberVariant
    ? "rounded-lg border border-neutral-300 px-3.5 py-2.5 text-neutral-900 shadow-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
    : "rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        {memberVariant ? "Email or username" : "Email"}
        <input
          type={memberVariant ? "text" : "email"}
          autoComplete={memberVariant ? "username" : "email"}
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={memberVariant ? "you@company.com or BWF001" : undefined}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Password
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      {memberVariant ? (
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 accent-emerald-800"
          />
          Keep me signed in on this device
        </label>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={
          memberVariant
            ? "rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            : "rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        }
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <a href={forgotPasswordUrl} className="text-sm text-neutral-500 hover:text-neutral-900">
        Forgot password?
      </a>
    </form>
  );
}
