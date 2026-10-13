"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitApplication } from "@/app/(public)/apply/actions";
import type { ChapterAvailability } from "@/lib/applications/availability";
import { trackEvent } from "@/lib/analytics";
import { BankPaymentDetails } from "@/components/marketing/bank-payment-details";

const initialState: { error?: string; success?: boolean } = {};

type Category = { id: string; name: string };

export function ApplyWizard({
  categories,
  availabilityByCategory,
  qrCodeUrl,
  bankAccountName,
  bankAccountNumber,
  bankIfsc,
  swiftCode,
  upiId,
  bankName,
  termsContent,
}: {
  categories: Category[];
  availabilityByCategory: Record<string, ChapterAvailability[]>;
  qrCodeUrl?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  swiftCode?: string | null;
  upiId?: string | null;
  bankName?: string | null;
  /** Server-rendered Membership T&C copy, shown in the acceptance pop-up. */
  termsContent: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(submitApplication, initialState);
  const [categoryId, setCategoryId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  // Client correction (2026-10-13): the Membership T&C open in a pop-up and
  // must be accepted there before the application can be submitted.
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsDialogRef = useRef<HTMLDialogElement>(null);
  const openTerms = () => termsDialogRef.current?.showModal();

  // Brief §50 — "Membership submissions".
  useEffect(() => {
    if (state?.success) {
      trackEvent("membership_application_submitted", { categoryId, chapterId, joiningWaitlist });
    }
  }, [state?.success, categoryId, chapterId, joiningWaitlist]);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="text-ivory-100">
          Thank you — your application has been received. BWF will be in touch shortly.
        </p>
      </div>
    );
  }

  const availability = categoryId ? availabilityByCategory[categoryId] ?? [] : [];
  const availableChapters = availability.filter((c) => c.available);
  const showForm = Boolean(categoryId) && (chapterId !== null || joiningWaitlist);

  return (
    <div className="flex flex-col gap-10">
      {/* Step 1 */}
      <div>
        <span className="inline-flex items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-medium text-gold-300">
          Step 1 — Category
        </span>
        <select
          aria-label="Business category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setChapterId(null);
            setJoiningWaitlist(false);
          }}
          className="mt-3 w-full rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
        >
          <option value="">Select your business category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2 — availability */}
      {categoryId ? (
        <div>
          <span className="inline-flex items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-medium text-gold-300">
            Step 2 — Chapter availability
          </span>
          <div className="mt-3 flex flex-col gap-2">
            {availability.map((c) => (
              <button
                key={c.chapterId}
                type="button"
                disabled={!c.available}
                onClick={() => {
                  setChapterId(c.chapterId);
                  setJoiningWaitlist(false);
                }}
                className={`flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  chapterId === c.chapterId
                    ? "border-gold-500 text-gold-300"
                    : c.available
                      ? "border-emerald-600 text-ivory-100 hover:border-gold-500/50"
                      : "cursor-not-allowed border-emerald-700 text-slate-600"
                }`}
              >
                <span>
                  {c.chapterName} {c.location ? `· ${c.location}` : ""}
                </span>
                <span>{c.available ? "Available" : "Occupied"}</span>
              </button>
            ))}
          </div>

          {availableChapters.length === 0 ? (
            <div className="mt-4 rounded-md border border-emerald-600 p-4">
              <p className="text-sm text-slate-300">
                Currently unavailable in existing chapters — every active chapter already has a
                member in this category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setJoiningWaitlist(true);
                  setChapterId(null);
                }}
                className="mt-3 rounded-full bg-gold-500 px-5 py-2 text-sm font-medium text-emerald-950 hover:bg-gold-400"
              >
                Join the waiting list
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Step 3/4 — application form */}
      {showForm ? (
        <form action={formAction} className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-medium text-gold-300">
            Step 3 — {joiningWaitlist ? "Waiting list" : "Your details"}
          </span>
          <input type="hidden" name="categoryId" value={categoryId} />
          {chapterId ? <input type="hidden" name="chapterId" value={chapterId} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Name
              <input name="name" required className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Phone
              <input name="phone" required className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
              Email
              <input name="email" type="email" required className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Company
              <input name="companyName" required className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Designation
              <input name="designation" className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              Years in business
              <input name="yearsInBusiness" type="number" min="0" className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
              How did you hear about BWF?
              <input name="referralSource" className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
              Short company information
              <textarea name="companyInfo" rows={3} className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none" />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            If you&rsquo;d like to pay your membership fee now, you can use the details below —
            it&rsquo;s optional at this stage and doesn&rsquo;t affect your application review.
          </p>
          <BankPaymentDetails
            qrCodeUrl={qrCodeUrl ?? null}
            accountName={bankAccountName ?? null}
            accountNumber={bankAccountNumber ?? null}
            ifsc={bankIfsc ?? null}
            swiftCode={swiftCode ?? null}
            upiId={upiId ?? null}
            bankName={bankName ?? null}
            screenshotFieldName="paymentScreenshotUrl"
          />

          <label className="flex items-start gap-2 text-sm text-slate-400">
            <input type="checkbox" name="consent" className="mt-1 h-4 w-4" />
            I agree to be contacted by BWF about my application.
          </label>

          <label className="flex items-start gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={termsAccepted}
              onChange={(e) => {
                // Ticking it opens the terms; only "I accept" in the pop-up ticks it.
                if (e.target.checked) openTerms();
                else setTermsAccepted(false);
              }}
              className="mt-1 h-4 w-4"
            />
            <span>
              I have read and accept all the{" "}
              <button type="button" onClick={openTerms} className="text-gold-400 underline underline-offset-2 hover:text-gold-300">
                Membership Terms &amp; Conditions
              </button>
              .
            </span>
          </label>

          {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

          <button
            type="submit"
            disabled={pending || !termsAccepted}
            className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </form>
      ) : null}

      <dialog
        ref={termsDialogRef}
        aria-labelledby="membership-terms-title"
        className="m-auto flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl flex-col rounded-sm border border-emerald-700 bg-emerald-950 p-0 text-ivory-100 backdrop:bg-black/70 [&:not([open])]:hidden"
      >
        <div className="flex items-center justify-between gap-4 border-b border-emerald-700 px-6 py-4">
          <h2 id="membership-terms-title" className="font-display text-xl text-ivory-100">
            Membership Terms &amp; Conditions
          </h2>
          <button
            type="button"
            onClick={() => termsDialogRef.current?.close()}
            aria-label="Close"
            className="text-2xl leading-none text-slate-400 hover:text-ivory-100"
          >
            &times;
          </button>
        </div>
        <div className="prose prose-invert prose-sm prose-headings:font-display prose-strong:text-ivory-100 max-w-none flex-1 overflow-y-auto px-6 py-4">
          {termsContent}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-emerald-700 px-6 py-4">
          <button
            type="button"
            onClick={() => termsDialogRef.current?.close()}
            className="rounded-full border border-emerald-600 px-5 py-2 text-sm text-slate-300 hover:border-gold-500/50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              setTermsAccepted(true);
              termsDialogRef.current?.close();
            }}
            className="rounded-full bg-gold-500 px-5 py-2 text-sm font-medium text-emerald-950 hover:bg-gold-400"
          >
            I have read and accept
          </button>
        </div>
      </dialog>
    </div>
  );
}
