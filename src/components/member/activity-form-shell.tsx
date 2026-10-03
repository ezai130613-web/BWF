"use client";

import type { LucideIcon } from "lucide-react";
import { FormStatus, primaryButtonClass } from "@/components/member/ui";

/** Shared frame for every "record an activity" form in the member portal. */
export function ActivityFormShell({
  id = "record",
  icon: Icon,
  title,
  description,
  formRef,
  action,
  pending,
  error,
  success,
  submitLabel,
  children,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  formRef: React.RefObject<HTMLFormElement | null>;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  success?: string | false;
  submitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-gold-300">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-neutral-600">{description}</p> : null}
        </div>
      </div>
      <form ref={formRef} action={action} className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
        {children}
        <div className="flex flex-col gap-3 md:col-span-2">
          <FormStatus error={error} success={success} />
          <div>
            <button type="submit" disabled={pending} className={primaryButtonClass}>
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
