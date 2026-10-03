import type { LucideIcon } from "lucide-react";
import { CheckCircle2, AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Member portal design primitives (2026-10-03 redesign). BWF green —
 * emerald-800/900 for primary surfaces and actions, gold as the accent —
 * on a light, dense working surface. Server-safe (no hooks), so both page
 * Server Components and client forms import from here.
 */

export const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15 disabled:bg-neutral-50 disabled:text-neutral-500";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 focus-visible:ring-offset-2 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-emerald-700 hover:text-emerald-800";

export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        {Icon ? (
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-gold-300 shadow-sm">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-neutral-600">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  icon: Icon,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  icon?: LucideIcon;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-neutral-200/80 bg-white shadow-sm", className)}>
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {Icon ? <Icon className="h-4.5 w-4.5 text-emerald-700" aria-hidden /> : null}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
              {description ? <p className="mt-0.5 text-xs text-neutral-500">{description}</p> : null}
            </div>
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("p-5 sm:p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function FormStatus({ error, success }: { error?: string; success?: string | false | null }) {
  if (error) {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden />
        {success}
      </p>
    );
  }
  return null;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-emerald-700" aria-hidden /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ message, icon: Icon = Inbox }: { message: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm text-neutral-500">{message}</p>
    </div>
  );
}

/** Table shell for activity lists — horizontal scroll on narrow screens. */
export function DataTable({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string | null }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className={cn("w-full text-left text-sm", empty ? "" : "min-w-[28rem]")}>
        {empty ? null : (
          <thead className="border-y border-neutral-100 bg-neutral-50/70 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-5 py-2.5 font-medium sm:px-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
      {empty ? <EmptyState message={empty} /> : null}
    </div>
  );
}

export const tdClass = "px-5 py-3 sm:px-6";

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
