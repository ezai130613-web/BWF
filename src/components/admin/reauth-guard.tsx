"use client";

import { useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import { confirmRecentAuth } from "@/lib/auth/reauth-actions";

const RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000;

function subscribeToClock(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, 30_000);
  return () => clearInterval(id);
}

/** Date.now() is impure, so it's read through useSyncExternalStore (React's
 * sanctioned way to pull in an external/mutable value) rather than directly
 * during render — a 30s tick is plenty for a 15-minute staleness window.
 *
 * `loading` (useSession()'s client-side fetch hasn't resolved yet) is
 * deliberately NOT treated as stale — see the real bug this fixed, below. */
function useIsStale(authTime: number, loading: boolean) {
  return useSyncExternalStore(
    subscribeToClock,
    () => !loading && Date.now() - authTime > RECENT_AUTH_WINDOW_MS,
    () => false,
  );
}

/**
 * Gates high-risk admin controls (role/permission toggles, user suspension)
 * behind a password re-check once the session is more than 15 minutes old —
 * matching the requireRecentAuth() window those Server Actions enforce
 * server-side. Without this, clicking a gated control after 15 minutes threw
 * straight into the generic "you don't have access" screen with no way to
 * proceed short of signing out and back in.
 *
 * **Real bug fixed 2026-09-15**: `useSession()` has no server-hydrated
 * initial value (`<SessionProvider>` in session-provider.tsx is given no
 * `session` prop), so on every fresh page load `data` starts `undefined`
 * for the ~50-100ms until its own client-side `/api/auth/session` fetch
 * resolves. `authTime` was defaulting to `0` during that window, which
 * `useIsStale` read as "signed in at the Unix epoch" — always stale — so
 * this component rendered the *real* content server-side (SSR's
 * `getServerSnapshot` always returns false), then swapped to the password
 * prompt the instant client hydration ran, then swapped *back* to the real
 * content once the session fetch actually completed. Two DOM replacements
 * on every load, not just once when genuinely stale — a click landing in
 * that window hit a button that was about to be unmounted and never
 * reached the server, which read exactly like "toggling a permission does
 * nothing." Fixed by treating the loading gap itself as not-stale, so the
 * content only ever swaps once real session data proves it's actually old.
 */
export function ReauthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const authTime = session?.user?.authTime ?? 0;
  const stale = useIsStale(authTime, status === "loading");

  if (!stale) return <>{children}</>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await confirmRecentAuth(password);
    if (!result.ok) {
      setPending(false);
      setError(result.error ?? "Incorrect password.");
      return;
    }
    await update({ refreshAuthTime: true });
    setPassword("");
    setPending(false);
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">
        For your security, confirm your password again before making changes here — it&apos;s
        been a while since you signed in.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Confirming…" : "Confirm"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
