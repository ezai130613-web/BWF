"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import { drawInvitationPoster, loadImage, POSTER_HEIGHT, POSTER_WIDTH, type InvitationPosterFonts } from "@/lib/invitations/poster";
import { imageUrlToDataUrl, saveInvitation } from "./actions";
import type { InvitationFormValues, InvitationSourceData } from "./types";

function readFonts(): InvitationPosterFonts {
  if (typeof window === "undefined") return { display: "Georgia, serif", sans: "system-ui, sans-serif" };
  const style = getComputedStyle(document.documentElement);
  const display = style.getPropertyValue("--font-display").trim();
  const sans = style.getPropertyValue("--font-sans").trim();
  return {
    display: display ? `${display}, Georgia, serif` : "Georgia, serif",
    sans: sans ? `${sans}, system-ui, sans-serif` : "system-ui, sans-serif",
  };
}

function slugForFilename(label: string) {
  return label.replace(/[^a-zA-Z0-9]+/g, "");
}

export function InvitationEditor({
  meetingId,
  source,
  initialValues,
  isStale,
  hasSavedInvitation,
}: {
  meetingId: string;
  source: InvitationSourceData;
  initialValues: InvitationFormValues;
  isStale: boolean;
  hasSavedInvitation: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontsRef = useRef<InvitationPosterFonts>(readFonts());

  const [values, setValues] = useState<InvitationFormValues>(initialValues);
  const [savedJson, setSavedJson] = useState<string | null>(hasSavedInvitation ? JSON.stringify(initialValues) : null);
  const [staleBannerVisible, setStaleBannerVisible] = useState(isStale);

  const [guestPhotoImg, setGuestPhotoImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Bumped only by an explicit "Refresh from meeting" — remounts
  // MediaUploadField so it picks up the reset value, without remounting (and
  // losing focus/cursor) on every normal keystroke or upload.
  const [photoResetKey, setPhotoResetKey] = useState(0);

  const isDirty = savedJson === null || savedJson !== JSON.stringify(values);

  const update = useCallback(<K extends keyof InvitationFormValues>(key: K, value: InvitationFormValues[K]) => {
    setSaveMessage(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Chief guest photo → same-origin data: URL, so canvas export never taints
  // (spec requirement #9 — this file's own server action explains why).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!values.guestPhotoUrl) {
        setGuestPhotoImg(null);
        return;
      }
      setPhotoLoading(true);
      setLoadError(null);
      try {
        const dataUrl = await imageUrlToDataUrl(values.guestPhotoUrl);
        const img = await loadImage(dataUrl);
        if (!cancelled) setGuestPhotoImg(img);
      } catch (err) {
        if (!cancelled) {
          setGuestPhotoImg(null);
          setLoadError(err instanceof Error ? err.message : "Could not load the chief guest photo.");
        }
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [values.guestPhotoUrl]);

  // Visitor registration QR — generated client-side from the same check-in
  // URL /admin/visitors-qr uses, so it always points at the right meeting.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!values.includeQr || !source.checkinUrl) {
        setQrImg(null);
        return;
      }
      setQrLoading(true);
      try {
        const dataUrl = await QRCode.toDataURL(source.checkinUrl, {
          margin: 1,
          width: 480,
          color: { dark: "#0a2118", light: "#f4eee1" },
        });
        const img = await loadImage(dataUrl);
        if (!cancelled) setQrImg(img);
      } catch {
        if (!cancelled) setLoadError("Could not generate the registration QR code.");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [values.includeQr, source.checkinUrl]);

  // Single shared draw call — the same pixels the preview shows are exactly
  // what Download exports (spec §6).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.fonts?.ready
      .then(() => {
        fontsRef.current = readFonts();
        drawInvitationPoster(
          ctx,
          {
            headingLine1: values.headingLine1,
            headingLine2: values.headingLine2,
            chapterLabel: source.chapterLabel,
            guestName: values.guestName,
            guestDesignation: values.guestDesignation,
            guestOrganisation: values.guestOrganisation,
            whyAttendText: values.whyAttendText,
            dateLabel: values.dateLabel,
            timeLabel: values.timeLabel,
            venueLabel: values.venueLabel,
            addressLabel: values.addressLabel,
            feeLabel: values.feeLabel,
            isComplimentary: values.isComplimentary,
            includeQr: values.includeQr,
          },
          { guestPhoto: guestPhotoImg, qrCode: qrImg },
          fontsRef.current,
        );
      })
      .catch(() => {
        /* fonts failing to load is non-fatal — canvas falls back to its default font */
      });
  }, [values, guestPhotoImg, qrImg, source.chapterLabel]);

  // Unsaved-edit protection (requirement #10) for a real page close/refresh.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function goBack() {
    if (isDirty && !window.confirm("You have unsaved invitation changes. Leave without saving?")) return;
    router.push("/admin/invitations");
  }

  function refreshFromMeeting() {
    setValues((prev) => ({
      ...prev,
      guestName: source.defaultGuestName,
      guestDesignation: source.defaultGuestDesignation,
      guestOrganisation: source.defaultGuestOrganisation,
      guestPhotoUrl: source.defaultGuestPhotoUrl,
      dateLabel: source.defaultDateLabel,
      venueLabel: source.defaultVenueLabel,
      addressLabel: source.defaultAddressLabel,
    }));
    setPhotoResetKey((k) => k + 1);
    setStaleBannerVisible(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveInvitation(meetingId, values);
      setSavedJson(JSON.stringify(values));
      setSaveMessage("Saved.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Couldn't save the invitation.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setLoadError("Couldn't generate the poster image — try again.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const filename = `BWF_${slugForFilename(source.chapterLabel.replace("BWF – ", ""))}_${source.meetingDateIso}_Invitation.png`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  const downloadDisabled = photoLoading || qrLoading;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={goBack} className="self-start text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to Meeting Invitation Generator
      </button>

      {staleBannerVisible ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Newer meeting information is available since this invitation was last saved.</span>
          <button type="button" onClick={refreshFromMeeting} className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium hover:bg-amber-100">
            Refresh from meeting
          </button>
        </div>
      ) : null}

      {loadError ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{loadError}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section B — Edit Invitation Details */}
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Invitation Heading</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Heading">
                <input value={values.headingLine1} onChange={(e) => update("headingLine1", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Subheading">
                <input value={values.headingLine2} onChange={(e) => update("headingLine2", e.target.value)} className={inputClass} />
              </Field>
              <p className="text-xs text-neutral-500">Chapter: {source.chapterLabel}</p>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <h2 className="text-sm font-semibold text-neutral-900">Chief Guest</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Name">
                <input value={values.guestName} onChange={(e) => update("guestName", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Designation">
                <input value={values.guestDesignation} onChange={(e) => update("guestDesignation", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Organisation">
                <input value={values.guestOrganisation} onChange={(e) => update("guestOrganisation", e.target.value)} className={inputClass} />
              </Field>
              <MediaUploadField
                // Remounts only on an explicit "Refresh from meeting" —
                // MediaUploadField owns its displayed value internally from
                // defaultValue just once, so a key bump is what makes it
                // pick up an externally-reset value without remounting (and
                // losing focus) on every normal keystroke or upload.
                key={photoResetKey}
                label="Photograph"
                name="guestPhotoUrl"
                kind="image"
                defaultValue={values.guestPhotoUrl}
                onValueChange={(value) => update("guestPhotoUrl", value)}
                helperText="Leave blank for a text-only layout — no broken image or stock photo will be shown."
              />
              {photoLoading ? <p className="text-xs text-neutral-500">Loading photo…</p> : null}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <Field label="Why Attend BWF?">
              <textarea
                value={values.whyAttendText}
                onChange={(e) => update("whyAttendText", e.target.value)}
                rows={3}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <h2 className="text-sm font-semibold text-neutral-900">Meeting Details</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Date">
                <input value={values.dateLabel} onChange={(e) => update("dateLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Time">
                <input
                  value={values.timeLabel}
                  onChange={(e) => update("timeLabel", e.target.value)}
                  placeholder="7:00 AM – 9:00 AM"
                  className={inputClass}
                />
              </Field>
              <Field label="Venue">
                <input value={values.venueLabel} onChange={(e) => update("venueLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Address">
                <input value={values.addressLabel} onChange={(e) => update("addressLabel", e.target.value)} className={inputClass} />
              </Field>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <Field label="Visitor Fee">
                <input
                  value={values.feeLabel}
                  onChange={(e) => update("feeLabel", e.target.value)}
                  disabled={values.isComplimentary}
                  placeholder="₹1,000"
                  className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-400`}
                />
              </Field>
              <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={values.isComplimentary}
                  onChange={(e) => update("isComplimentary", e.target.checked)}
                />
                Complimentary Entry
              </label>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={values.includeQr}
                disabled={!source.checkinUrl}
                onChange={(e) => update("includeQr", e.target.checked)}
              />
              Include Visitor Registration QR Code
            </label>
            {!source.checkinUrl ? (
              <p className="mt-1 text-xs text-amber-600">
                No visitor registration link is available for this meeting yet — the QR option is disabled until one exists
                (generate it from Visitors QR).
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Invitation"}
            </button>
            {saveMessage ? <p className="text-sm text-neutral-600">{saveMessage}</p> : null}
            {isDirty && !saveMessage ? <p className="text-xs text-neutral-400">Unsaved changes</p> : null}
          </div>
        </div>

        {/* Section C — Invitation Preview & Download */}
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
          <canvas
            ref={canvasRef}
            width={POSTER_WIDTH}
            height={POSTER_HEIGHT}
            className="w-full max-w-sm rounded-md shadow-lg"
            style={{ aspectRatio: `${POSTER_WIDTH} / ${POSTER_HEIGHT}` }}
          />
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadDisabled}
            className="w-full max-w-sm rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadDisabled ? "Preparing poster…" : "Download Invitation (PNG)"}
          </button>
          <p className="text-center text-xs text-neutral-500">1600 × 2000px · suitable for WhatsApp sharing</p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
    </label>
  );
}
