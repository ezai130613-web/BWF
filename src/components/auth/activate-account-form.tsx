"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { completeActivation, sendActivationCode } from "@/app/member/activate/actions";

const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20";

export function ActivateAccountForm({ requireCode, username }: { requireCode: boolean; username: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const emailLocked = requireCode && codeSentTo !== null;

  function handleSendCode() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendActivationCode(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCodeSentTo(email.trim().toLowerCase());
      setNotice(`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeActivation({ email, code, password, confirmPassword });
      if (result.error) {
        setError(result.error);
        return;
      }
      // The temporary-password session was just revoked server-side; sign
      // straight back in with the new private credentials.
      const signInResult = await signIn("member-login", {
        email: email.trim().toLowerCase(),
        password,
        remember: remember ? "true" : "false",
        redirect: false,
      });
      if (signInResult?.error) {
        router.push("/member/login");
        return;
      }
      router.push("/member");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {username ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Temporary username: <span className="font-mono font-semibold">{username}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="activate-email" className="text-sm font-medium text-neutral-800">
          1. Your email address
        </label>
        <div className="flex gap-2">
          <input
            id="activate-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            readOnly={emailLocked}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} ${emailLocked ? "bg-neutral-50 text-neutral-600" : ""}`}
          />
          {requireCode ? (
            <button
              type="button"
              disabled={pending || !email}
              onClick={handleSendCode}
              className="flex-shrink-0 rounded-lg border border-emerald-800 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {codeSentTo ? "Resend" : "Send code"}
            </button>
          ) : null}
        </div>
        {emailLocked ? (
          <button
            type="button"
            onClick={() => {
              setCodeSentTo(null);
              setCode("");
              setNotice(null);
            }}
            className="self-start text-xs text-neutral-500 underline"
          >
            Use a different email
          </button>
        ) : null}
      </div>

      {requireCode ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="activate-code" className="text-sm font-medium text-neutral-800">
            2. Verification code
          </label>
          <input
            id="activate-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            disabled={!codeSentTo}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder={codeSentTo ? "6-digit code" : "Send a code first"}
            className={`${inputClass} font-mono tracking-[0.3em] disabled:bg-neutral-50`}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="activate-password" className="text-sm font-medium text-neutral-800">
          {requireCode ? "3." : "2."} New private password
        </label>
        <input
          id="activate-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-neutral-500">At least 12 characters. Don&rsquo;t reuse the temporary password.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="activate-confirm" className="text-sm font-medium text-neutral-800">
          Confirm new password
        </label>
        <input
          id="activate-confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 accent-emerald-800"
        />
        Keep me signed in on this device
      </label>

      {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || (requireCode && !codeSentTo)}
        className="rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? "Please wait…" : "Activate & continue"}
      </button>
    </form>
  );
}
