"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-step (request code, then set new password) reset UI shared by both
 * /admin/reset-password and /member/reset-password — same split as
 * OtpLoginForm (state machine + markup identical between surfaces, only the
 * request/reset endpoints and login destination differ).
 */
export function ResetPasswordForm({
  requestUrl,
  resetUrl,
  loginUrl,
}: {
  requestUrl: string;
  resetUrl: string;
  loginUrl: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // The endpoint always responds the same way regardless of whether the
      // account exists — nothing to branch on here.
      setStep("reset");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(resetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      router.push(loginUrl);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-600">
          If <span className="font-medium text-neutral-900">{email}</span> is a registered account,
          we&rsquo;ve sent a reset code.
          {process.env.NODE_ENV !== "production" && (
            <span className="mt-1 block text-xs text-amber-700">
              Dev mode: check the server console for the code instead of your inbox.
            </span>
          )}
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Reset code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-lg tracking-[0.3em] text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
        <button
          type="button"
          onClick={() => setStep("request")}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset code"}
      </button>
      <a href={loginUrl} className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to sign in
      </a>
    </form>
  );
}
