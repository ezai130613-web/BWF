"use client";

import { useTransition } from "react";
import { updateApplicationStatus } from "@/app/admin/(dashboard)/applications/actions";
import type { $Enums } from "@/generated/prisma/client";

const STATUSES: $Enums.ApplicationStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "APPROVED_IN_PRINCIPLE",
  "WAITING_FOR_PAYMENT",
  "PAID",
  "REJECTED",
  "WAITLISTED",
];

export function ApplicationStatusControl({ applicationId, status }: { applicationId: string; status: $Enums.ApplicationStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateApplicationStatus(applicationId, e.target.value as $Enums.ApplicationStatus))}
      className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
