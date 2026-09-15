"use client";

import { useActionState, useEffect } from "react";
import { registerVisitor } from "@/app/(public)/visit/actions";
import { trackEvent } from "@/lib/analytics";
import { TrackedAnchor } from "@/components/analytics/tracked-anchor";
import { Button } from "@/components/ui/button";
import { BankPaymentDetails } from "@/components/marketing/bank-payment-details";

const initialState: { error?: string; success?: boolean } = {};

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

type Option = { id: string; name: string };

export function VisitorRegisterForm({
  categories,
  chapters,
  members,
  meetingId,
  fixedChapter,
  qrCodeUrl,
  visitorMeetingOnlyFee,
  visitorMeetingBreakfastFee,
  bankAccountName,
  bankAccountNumber,
  bankIfsc,
  upiId,
  bankName,
}: {
  categories: Option[];
  chapters?: Option[];
  members: Option[];
  meetingId?: string;
  fixedChapter?: Option;
  qrCodeUrl?: string | null;
  visitorMeetingOnlyFee?: string | null;
  visitorMeetingBreakfastFee?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  bankName?: string | null;
}) {
  const [state, formAction, pending] = useActionState(registerVisitor, initialState);

  useEffect(() => {
    if (state?.success) {
      trackEvent("visitor_registration", { meetingId });
    }
  }, [state?.success, meetingId]);

  if (state?.success) {
    return (
      <div className="rounded-sm border border-gold-500/40 p-8 text-center">
        <p className="font-display text-2xl text-ivory-100">Your BWF Visit Request Has Been Received.</p>
        <p className="mt-3 text-sm text-slate-400">
          Thank you for registering to visit Builders World Forum. Our team will verify your
          registration and payment and share your chapter meeting details with you.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {WHATSAPP_NUMBER ? (
            <TrackedAnchor
              eventName="whatsapp_click"
              eventParams={{ location: "visit_confirmation" }}
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gold-500/60 px-6 py-3 text-sm font-medium text-ivory-100 hover:border-gold-400 hover:text-gold-300"
            >
              Message BWF on WhatsApp
            </TrackedAnchor>
          ) : null}
          <Button href="/chapters" variant="primary">
            Explore BWF Chapters
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {meetingId ? <input type="hidden" name="meetingId" value={meetingId} /> : null}
      {fixedChapter ? <input type="hidden" name="chapterId" value={fixedChapter.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Full Name
          <input
            name="name"
            required
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Mobile Number
          <input
            name="phone"
            required
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Email Address
          <input
            name="email"
            type="email"
            required
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Company Name (optional)
          <input
            name="company"
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Designation (optional)
          <input
            name="designation"
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          Business Category
          <select
            name="categoryId"
            required
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {fixedChapter ? (
          <div className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Chapter
            <p className="rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100">
              {fixedChapter.name}
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Which chapter would you like to visit?
            <select
              name="chapterId"
              required
              className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
            >
              <option value="">Select…</option>
              {chapters?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Purpose of Visit
          <select
            name="purposeOfVisit"
            required
            defaultValue=""
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="PROSPECTIVE_MEMBER">I am exploring BWF Membership</option>
            <option value="END_CONSUMER">I am an End Consumer / Have a Construction Requirement</option>
            <option value="CHIEF_GUEST">I would like to visit as a Chief Guest / Business Connect</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Meeting Option (prebooking rate)
          <select
            name="meetingOption"
            required
            defaultValue=""
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="MEETING_ONLY">Meeting Only — {visitorMeetingOnlyFee ?? "TBC"}</option>
            <option value="MEETING_BREAKFAST">
              Meeting + Networking Breakfast — {visitorMeetingBreakfastFee ?? "TBC"}
            </option>
          </select>
          <span className="text-xs font-normal text-slate-500">
            Walk-in (onspot) pricing is higher — see Meeting Charges on the Chapters page.
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
          Referred by a member? (optional)
          <select
            name="referringMemberId"
            className="w-full min-w-0 rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none"
          >
            <option value="">None</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BankPaymentDetails
        qrCodeUrl={qrCodeUrl ?? null}
        accountName={bankAccountName ?? null}
        accountNumber={bankAccountNumber ?? null}
        ifsc={bankIfsc ?? null}
        upiId={upiId ?? null}
        bankName={bankName ?? null}
        screenshotFieldName="paymentScreenshotUrl"
      />

      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {pending ? "Registering…" : "Register My Visit"}
      </button>
    </form>
  );
}
