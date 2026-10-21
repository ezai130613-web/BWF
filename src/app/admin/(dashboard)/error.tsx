"use client";

/**
 * Genuine unexpected errors only — access-denied cases now go through
 * forbidden.tsx instead (backlog #14), via next/navigation's forbidden()
 * in src/lib/auth/rbac.ts, which is a navigation interrupt that never
 * reaches this boundary.
 */
export default function AdminError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-neutral-200/80 bg-white shadow-sm p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Something went wrong.</h1>
      <p className="text-sm text-neutral-600">{error.message}</p>
    </div>
  );
}
