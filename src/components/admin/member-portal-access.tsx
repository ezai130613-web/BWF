"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMemberLogin,
  resetMemberTemporaryPassword,
  toggleMemberPortalAccess,
  type MemberLoginResult,
} from "@/app/admin/(dashboard)/members/actions";

/**
 * Member portal login on the member's admin page (2026-10-03): one click
 * creates the next BWFCC username for the chapter with the shared temporary
 * password; the member verifies an email and sets their own password on
 * first sign-in.
 */
export function MemberPortalAccess({
  memberId,
  memberStatus,
  linkedUser,
}: {
  memberId: string;
  memberStatus: string;
  linkedUser: { email: string | null; username: string | null; status: string; mustChangePassword: boolean } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MemberLoginResult | null>(null);

  function run(action: () => Promise<MemberLoginResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setResult(null);
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (!r.error) router.refresh();
    });
  }

  const issued = result && !result.error && result.username ? (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      Share with the member — Username: <span className="font-mono font-semibold">{result.username}</span> · Temporary password:{" "}
      <span className="font-mono font-semibold">{result.password}</span>
      <p className="mt-1 text-xs text-emerald-800">
        On first sign-in at /member/login they verify their email and choose their own password.
      </p>
    </div>
  ) : null;
  const error = result?.error ? <p className="text-sm text-red-600">{result.error}</p> : null;

  if (linkedUser) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Portal login: {[linkedUser.username, linkedUser.email].filter(Boolean).join(" · ") || "—"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Status:{" "}
              <span className={linkedUser.status === "ACTIVE" ? "text-emerald-700" : "text-red-700"}>{linkedUser.status}</span>
              {linkedUser.mustChangePassword ? (
                <span className="ml-2 text-amber-700">· Temporary password — member hasn&rsquo;t activated yet</span>
              ) : (
                <span className="ml-2 text-emerald-700">· Activated</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {linkedUser.mustChangePassword && linkedUser.username ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => resetMemberTemporaryPassword(memberId), "Reset this member's password back to the temporary password?")}
                className="text-sm text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
              >
                Reset to temporary password
              </button>
            ) : null}
            <form action={toggleMemberPortalAccess.bind(null, memberId)}>
              <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
                {linkedUser.status === "ACTIVE" ? "Revoke access" : "Restore access"}
              </button>
            </form>
          </div>
        </div>
        {issued}
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Member portal login</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Creates the next username for this member&rsquo;s chapter (Chapter 1 → BWFCC1xx, Chapter 2 → BWFCC2xx…) with the temporary password 1234.
          </p>
        </div>
        <button
          type="button"
          disabled={pending || memberStatus !== "ACTIVE"}
          onClick={() => run(() => createMemberLogin(memberId))}
          className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create login"}
        </button>
      </div>
      {memberStatus !== "ACTIVE" ? <p className="text-xs text-amber-700">Only active members can be given a login.</p> : null}
      {issued}
      {error}
    </div>
  );
}
