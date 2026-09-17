"use client";

import { useActionState, useState } from "react";
import { reviewPayment } from "@/app/admin/(dashboard)/payments/actions";

const initialState: { error?: string; success?: boolean } = {};

/** Spec: Approve / Reject (reason required) / Request Clarification — gated by payments:approve, rendered only for callers who hold it (see the page's own canApprove check). */
export function PaymentReviewActions({ paymentId, status }: { paymentId: string; status: string }) {
  const [mode, setMode] = useState<"REJECTED" | "CLARIFICATION_REQUESTED" | null>(null);
  const approveAction = useActionState(reviewPayment.bind(null, paymentId, "APPROVED"), initialState);
  const rejectAction = useActionState(reviewPayment.bind(null, paymentId, "REJECTED"), initialState);
  const clarifyAction = useActionState(reviewPayment.bind(null, paymentId, "CLARIFICATION_REQUESTED"), initialState);

  if (status === "APPROVED" || status === "REJECTED") {
    return null;
  }

  if (mode === "REJECTED") {
    const [, formAction, pending] = rejectAction;
    return (
      <ReasonForm
        label="Reason for rejection (required)"
        required
        formAction={formAction}
        pending={pending}
        error={rejectAction[0]?.error}
        onCancel={() => setMode(null)}
        submitLabel="Confirm Reject"
      />
    );
  }

  if (mode === "CLARIFICATION_REQUESTED") {
    const [, formAction, pending] = clarifyAction;
    return (
      <ReasonForm
        label="What clarification is needed?"
        required={false}
        formAction={formAction}
        pending={pending}
        error={clarifyAction[0]?.error}
        onCancel={() => setMode(null)}
        submitLabel="Send Request"
      />
    );
  }

  const [, approveFormAction, approvePending] = approveAction;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
      <form action={approveFormAction}>
        <button
          type="submit"
          disabled={approvePending}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {approvePending ? "Approving…" : "Approve"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode("REJECTED")}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:border-red-400"
      >
        Reject
      </button>
      <button
        type="button"
        onClick={() => setMode("CLARIFICATION_REQUESTED")}
        className="rounded-md border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:border-sky-400"
      >
        Request Clarification
      </button>
    </div>
  );
}

function ReasonForm({
  label,
  required,
  formAction,
  pending,
  error,
  onCancel,
  submitLabel,
}: {
  label: string;
  required: boolean;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2 border-t border-neutral-100 pt-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        {label}
        <textarea name="remarks" required={required} rows={2} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-neutral-500 hover:text-neutral-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
