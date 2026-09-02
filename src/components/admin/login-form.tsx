"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/admin/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setChallengeId(data.challengeId);
      setStep("otp");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await signIn("admin-otp", {
        challengeId,
        code,
        redirect: false,
      });

      if (result?.error) {
        setError("Incorrect or expired code.");
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

  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-600">
            We sent a 6-digit code to <span className="font-medium text-neutral-900">{email}</span>.
            {process.env.NODE_ENV !== "production" && (
              <span className="mt-1 block text-xs text-amber-700">
                Dev mode: check the server console for the code instead of your inbox.
              </span>
            )}
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Verification code
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Verifying…" : "Verify & sign in"}
        </button>
        <button
          type="button"
          onClick={() => setStep("credentials")}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
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
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
