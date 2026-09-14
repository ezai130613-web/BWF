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
}: {
  providerId: string;
  defaultRedirectTo: string;
  forgotPasswordUrl: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? defaultRedirectTo;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.code === "account-locked"
            ? "Too many failed attempts. Try again later."
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
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
          className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <a href={forgotPasswordUrl} className="text-sm text-neutral-500 hover:text-neutral-900">
        Forgot password?
      </a>
    </form>
  );
}
