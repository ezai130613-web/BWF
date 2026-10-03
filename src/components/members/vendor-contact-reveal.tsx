"use client";

import { useActionState, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  revealVendorContact,
  submitVendorContactRequest,
  type SubmitState,
  type VendorContact,
} from "@/app/(public)/members/[slug]/contact-actions";
import { trackEvent } from "@/lib/analytics";

const inputClass =
  "rounded-md border border-emerald-600 bg-emerald-900 px-3 py-2 text-sm text-ivory-100 focus:border-gold-500 focus:outline-none";

/**
 * Phase 29 — "View contact details" gate on a public member profile. The
 * page passes only which contact methods exist, never their values; the
 * values arrive from a Server Action after the visitor has submitted the
 * pop-up form once (later clicks on this device skip the form).
 */
export function VendorContactReveal({ slug, memberName }: { slug: string; memberName: string }) {
  const [revealed, setRevealed] = useState<VendorContact | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  const [state, formAction, pending] = useActionState<SubmitState | undefined, FormData>(async (prev, formData) => {
    const result = await submitVendorContactRequest(slug, prev, formData);
    if (result.contact) trackEvent("member_contact_reveal", { memberSlug: slug, via: "form" });
    return result;
  }, undefined);

  // Either path can reveal: the remembered-device click or the pop-up form.
  const contact = revealed ?? state?.contact ?? null;

  function onClick() {
    setError(null);
    startChecking(async () => {
      const result = await revealVendorContact(slug);
      if (result.contact) {
        setRevealed(result.contact);
        trackEvent("member_contact_reveal", { memberSlug: slug, via: "remembered" });
      } else if (result.needsForm) {
        setOpen(true);
      } else {
        setError(result.error ?? "Something went wrong — please try again.");
      }
    });
  }

  if (contact) {
    const items = [
      { label: "Phone", value: contact.phone, href: contact.phone ? `tel:${contact.phone}` : undefined },
      { label: "WhatsApp", value: contact.whatsapp, href: contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` : undefined },
      { label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    ].filter((item) => item.value);

    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ivory-100">{contact.name}</p>
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.label === "WhatsApp" ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => trackEvent("member_contact_click", { method: item.label.toLowerCase(), memberSlug: slug })}
            className="text-sm text-ivory-100 hover:text-gold-400"
          >
            {item.label}: {item.value}
          </a>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={checking}
        className="self-start rounded-full bg-gold-500 px-5 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 disabled:opacity-50"
      >
        {checking ? "Loading…" : "View contact details"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10 sm:pt-20"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="vendor-contact-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-sm border border-emerald-700 bg-emerald-950 p-6 shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="vendor-contact-title" className="font-display text-xl text-ivory-100">
                      Contact {memberName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Share your details to view this member&rsquo;s phone, WhatsApp and email.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-slate-400 hover:text-ivory-100"
                  >
                    ✕
                  </button>
                </div>

                <form action={formAction} className="mt-5 flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
                    Your name
                    <input name="name" defaultValue={state?.fields?.name} required autoComplete="name" className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
                    Phone number
                    <input name="phone" defaultValue={state?.fields?.phone} type="tel" required autoComplete="tel" className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
                    Email (optional)
                    <input name="email" defaultValue={state?.fields?.email} type="email" autoComplete="email" className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
                    What do you need? (optional)
                    <textarea name="requirement" defaultValue={state?.fields?.requirement} rows={3} className={inputClass} />
                  </label>
                  <p className="text-xs text-slate-400">
                    Your details are shared with Builders World Forum so we can follow up on
                    enquiries. We&rsquo;ll remember them on this device so you won&rsquo;t need to
                    fill this in again.
                  </p>
                  {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
                  <button
                    type="submit"
                    disabled={pending}
                    className="self-start rounded-full bg-gold-500 px-6 py-2.5 text-sm font-medium text-emerald-950 hover:bg-gold-400 disabled:opacity-50"
                  >
                    {pending ? "Submitting…" : "Submit & view contact"}
                  </button>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
