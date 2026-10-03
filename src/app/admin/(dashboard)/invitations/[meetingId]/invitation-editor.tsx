"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { MediaUploadField } from "@/components/ui/media-upload-field";
import {
  drawInvitationPoster,
  loadImage,
  MAX_INVITATION_GUESTS,
  POSTER_HEIGHT,
  POSTER_WIDTH,
  type InvitationGuest,
  type InvitationPosterFonts,
} from "@/lib/invitations/poster";
import { imageUrlToDataUrl, saveInvitation } from "./actions";
import type { InvitationFormValues, InvitationSourceData } from "./types";

const DEFAULT_BACKGROUND = "/images/homepage-chapter-meeting.jpg";
const QR_CAPTION = { LOCATION: "Scan the QR for location", REGISTRATION: "Scan the QR to register" } as const;

/** Poster fonts come from next/font CSS variables set on the page wrapper. */
function readFonts(el: Element | null): InvitationPosterFonts {
  const style = el ? getComputedStyle(el) : null;
  const sans = style?.getPropertyValue("--font-poster-sans").trim();
  const script = style?.getPropertyValue("--font-poster-script").trim();
  return {
    sans: sans ? `${sans}, system-ui, sans-serif` : "system-ui, sans-serif",
    script: script ? `${script}, cursive` : "cursive",
  };
}

/** next/font only fetches a face once something uses it — canvas text doesn't count, so request each weight explicitly. */
async function ensureFonts(fonts: InvitationPosterFonts) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    ...["400", "500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 20px ${fonts.sans}`)),
    document.fonts.load(`700 20px ${fonts.script}`),
  ]).catch(() => undefined);
}

async function loadPosterImage(url: string) {
  // Same-origin assets draw directly; our R2 uploads go through the server
  // proxy so the canvas never taints (spec requirement #9).
  return loadImage(url.startsWith("/") ? url : await imageUrlToDataUrl(url));
}

function slugForFilename(label: string) {
  return label.replace(/[^a-zA-Z0-9]+/g, "");
}

const emptyGuest: InvitationGuest = { name: "", designation: "", organisation: "", organisationNote: "", photoUrl: "" };

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [values, setValues] = useState<InvitationFormValues>(initialValues);
  const [savedJson, setSavedJson] = useState<string | null>(hasSavedInvitation ? JSON.stringify(initialValues) : null);
  const [staleBannerVisible, setStaleBannerVisible] = useState(isStale);

  const [photoImgs, setPhotoImgs] = useState<Record<string, HTMLImageElement | null>>({});
  // Loaded images are stored with the URL they came from, so "still
  // loading" is derived (stored URL ≠ wanted URL) rather than counted.
  const [qr, setQr] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [background, setBackground] = useState<{ url: string; img: HTMLImageElement | null } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Remounts the photo upload fields when guests are reordered/replaced, so
  // each picks up its new value (MediaUploadField reads defaultValue once).
  const [guestFieldsKey, setGuestFieldsKey] = useState(0);
  const [catalogPick, setCatalogPick] = useState("");

  const isDirty = savedJson === null || savedJson !== JSON.stringify(values);

  const update = useCallback(<K extends keyof InvitationFormValues>(key: K, value: InvitationFormValues[K]) => {
    setSaveMessage(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateGuest = useCallback((index: number, patch: Partial<InvitationGuest>) => {
    setSaveMessage(null);
    setValues((prev) => ({ ...prev, guests: prev.guests.map((g, i) => (i === index ? { ...g, ...patch } : g)) }));
  }, []);

  function setGuests(guests: InvitationGuest[]) {
    update("guests", guests);
    setGuestFieldsKey((k) => k + 1);
  }

  // Fonts
  useEffect(() => {
    let cancelled = false;
    ensureFonts(readFonts(wrapperRef.current)).finally(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Static assets: logo + default background.
  useEffect(() => {
    let cancelled = false;
    loadImage("/images/brand/bwf-logo-512.png")
      .then((img) => !cancelled && setLogoImg(img))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const backgroundUrl = values.backgroundPhotoUrl || DEFAULT_BACKGROUND;
  useEffect(() => {
    let cancelled = false;
    loadPosterImage(backgroundUrl)
      .then((img) => !cancelled && setBackground({ url: backgroundUrl, img }))
      .catch(() => {
        if (!cancelled) {
          setBackground({ url: backgroundUrl, img: null });
          setLoadError("Couldn't load the background photo — the panel will be plain green.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [backgroundUrl]);
  const backgroundImg = background?.url === backgroundUrl ? background.img : null;

  // Guest photos, cached by URL.
  const photoUrls = values.guests.map((g) => g.photoUrl).filter(Boolean);
  const photoKey = photoUrls.join("|");
  useEffect(() => {
    const missing = photoKey.split("|").filter((u) => u && !(u in photoImgs));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (url) => {
        try {
          return [url, await loadPosterImage(url)] as const;
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : "Could not load a chief guest photo.");
          return [url, null] as const;
        }
      }),
    )
      .then((entries) => {
        if (!cancelled) setPhotoImgs((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      });
    return () => {
      cancelled = true;
    };
  }, [photoKey, photoImgs]);

  // QR — venue location (reference default) or visitor registration link.
  const qrUrl = values.qrTarget === "REGISTRATION" ? source.checkinUrl : source.locationUrl;
  useEffect(() => {
    if (!values.includeQr || !qrUrl) return;
    let cancelled = false;
    QRCode.toDataURL(qrUrl, { margin: 0, width: 420, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } })
      .then(loadImage)
      .then((img) => !cancelled && setQr({ url: qrUrl, img }))
      .catch(() => !cancelled && setLoadError("Could not generate the QR code."));
    return () => {
      cancelled = true;
    };
  }, [values.includeQr, qrUrl]);
  const qrImg = values.includeQr && qrUrl && qr?.url === qrUrl ? qr.img : null;

  // Single shared draw call — the preview pixels are exactly what Download exports.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !fontsReady) return;
    drawInvitationPoster(
      ctx,
      {
        eyebrow: values.eyebrow,
        headline: values.headline,
        guests: values.guests.filter((g) => g.name.trim()),
        whyAttendText: values.whyAttendText,
        dateLabel: values.dateLabel,
        timeLabel: values.timeLabel,
        venueLabel: values.venueLabel,
        addressLabel: values.addressLabel,
        websiteLabel: values.websiteLabel,
        contactPhones: values.contactPhones,
        ctaText: values.ctaText,
        feeLabel: values.feeLabel,
        feeNote: values.feeNote,
        isComplimentary: values.isComplimentary,
        includeQr: values.includeQr,
        qrCaption: QR_CAPTION[values.qrTarget],
      },
      {
        guestPhotos: values.guests.filter((g) => g.name.trim()).map((g) => (g.photoUrl ? photoImgs[g.photoUrl] ?? null : null)),
        qrCode: qrImg,
        logo: logoImg,
        background: backgroundImg,
      },
      readFonts(wrapperRef.current),
    );
  }, [values, photoImgs, qrImg, logoImg, backgroundImg, fontsReady]);

  // Unsaved-edit protection for a real page close/refresh.
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
      guests: source.defaultGuests.length ? source.defaultGuests : prev.guests,
      dateLabel: source.defaultDateLabel,
      timeLabel: source.defaultTimeLabel,
      venueLabel: source.defaultVenueLabel,
      addressLabel: source.defaultAddressLabel,
    }));
    setGuestFieldsKey((k) => k + 1);
    setStaleBannerVisible(false);
  }

  function addFromCatalog(id: string) {
    const g = source.guestCatalog.find((c) => c.id === id);
    if (!g || values.guests.length >= MAX_INVITATION_GUESTS) return;
    const { id: _id, ...guest } = g;
    void _id;
    setGuests([...values.guests, guest]);
    setCatalogPick("");
  }

  function moveGuest(index: number, delta: number) {
    const next = [...values.guests];
    const [g] = next.splice(index, 1);
    next.splice(index + delta, 0, g);
    setGuests(next);
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

  const imagesLoading =
    background?.url !== backgroundUrl ||
    photoUrls.some((u) => !(u in photoImgs)) ||
    Boolean(values.includeQr && qrUrl && qr?.url !== qrUrl);
  const downloadDisabled = imagesLoading || !fontsReady;
  const availableCatalog = source.guestCatalog.filter((c) => !values.guests.some((g) => g.name === c.name && g.organisation === c.organisation));

  return (
    <div ref={wrapperRef} className="flex flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Edit */}
        <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 bg-white p-6">
          <Section title="Header">
            <Field label="Top line">
              <input value={values.eyebrow} onChange={(e) => update("eyebrow", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Headline" hint="Small words like “for” and “and” are set in regular weight automatically, as in the reference.">
              <textarea value={values.headline} onChange={(e) => update("headline", e.target.value)} rows={2} className={inputClass} />
            </Field>
          </Section>

          <Section title={`Chief Guests (${values.guests.length}/${MAX_INVITATION_GUESTS})`}>
            {values.guests.map((g, i) => (
              <div key={`${guestFieldsKey}-${i}`} className="rounded-md border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Guest {i + 1}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <button type="button" disabled={i === 0} onClick={() => moveGuest(i, -1)} className="text-neutral-500 hover:text-neutral-900 disabled:opacity-30">
                      ← Move left
                    </button>
                    <button
                      type="button"
                      disabled={i === values.guests.length - 1}
                      onClick={() => moveGuest(i, 1)}
                      className="text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
                    >
                      Move right →
                    </button>
                    <button type="button" onClick={() => setGuests(values.guests.filter((_, j) => j !== i))} className="text-red-700 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Name">
                    <input value={g.name} onChange={(e) => updateGuest(i, { name: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Designation">
                    <input value={g.designation} onChange={(e) => updateGuest(i, { designation: e.target.value })} placeholder="Founder" className={inputClass} />
                  </Field>
                  <Field label="Organisation">
                    <input value={g.organisation} onChange={(e) => updateGuest(i, { organisation: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Line under organisation">
                    <input
                      value={g.organisationNote}
                      onChange={(e) => updateGuest(i, { organisationNote: e.target.value })}
                      placeholder="Builders & Contractors"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="mt-2">
                  <MediaUploadField
                    label="Photograph"
                    name={`guestPhoto${i}`}
                    kind="image"
                    defaultValue={g.photoUrl}
                    onValueChange={(value) => updateGuest(i, { photoUrl: value })}
                    helperText="A cut-out PNG (transparent background) looks exactly like the reference; a normal photo is cropped into the green frame. Blank shows initials."
                  />
                </div>
              </div>
            ))}
            {values.guests.length < MAX_INVITATION_GUESTS ? (
              <div className="flex flex-wrap items-center gap-2">
                <select value={catalogPick} onChange={(e) => addFromCatalog(e.target.value)} className={`${inputClass} max-w-xs`}>
                  <option value="">Add from Chief Guests list…</option>
                  {availableCatalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.organisation ? ` — ${c.organisation}` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setGuests([...values.guests, { ...emptyGuest }])} className="text-sm text-neutral-600 underline">
                  or add manually
                </button>
              </div>
            ) : null}
            {values.guests.length === 0 ? <p className="text-xs text-neutral-500">No chief guest yet — the poster leaves that section out.</p> : null}
          </Section>

          <Section title="What’s in it for you?">
            <textarea value={values.whyAttendText} onChange={(e) => update("whyAttendText", e.target.value)} rows={2} className={inputClass} />
          </Section>

          <Section title="Meeting details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" hint="“25th” is drawn as a superscript.">
                <input value={values.dateLabel} onChange={(e) => update("dateLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Time">
                <input value={values.timeLabel} onChange={(e) => update("timeLabel", e.target.value)} placeholder="7:00 AM – 9:30 AM" className={inputClass} />
              </Field>
              <Field label="Venue">
                <input value={values.venueLabel} onChange={(e) => update("venueLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Area / address">
                <input value={values.addressLabel} onChange={(e) => update("addressLabel", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Website">
                <input value={values.websiteLabel} onChange={(e) => update("websiteLabel", e.target.value)} className={inputClass} />
              </Field>
            </div>
          </Section>

          <Section title="QR code">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={values.includeQr} onChange={(e) => update("includeQr", e.target.checked)} />
              Show QR code
            </label>
            {values.includeQr ? (
              <div className="flex flex-col gap-1.5 text-sm text-neutral-700">
                <label className="flex items-center gap-2">
                  <input type="radio" name="qrTarget" checked={values.qrTarget === "LOCATION"} onChange={() => update("qrTarget", "LOCATION")} />
                  Venue location (Google Maps) — “Scan the QR for location”
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="qrTarget"
                    disabled={!source.checkinUrl}
                    checked={values.qrTarget === "REGISTRATION"}
                    onChange={() => update("qrTarget", "REGISTRATION")}
                  />
                  Visitor registration — “Scan the QR to register”
                </label>
              </div>
            ) : null}
          </Section>

          <Section title="Contact & registration">
            <Field label="Phone numbers">
              <input
                value={values.contactPhones}
                onChange={(e) => update("contactPhones", e.target.value)}
                placeholder="+91 99625 50806 | +91 94441 31213"
                className={inputClass}
              />
            </Field>
            <Field label="Button text">
              <input value={values.ctaText} onChange={(e) => update("ctaText", e.target.value)} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration fee">
                <input
                  value={values.feeLabel}
                  onChange={(e) => update("feeLabel", e.target.value)}
                  disabled={values.isComplimentary}
                  placeholder="₹1,000"
                  className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-400`}
                />
              </Field>
              <Field label="After the fee">
                <input value={values.feeNote} onChange={(e) => update("feeNote", e.target.value)} placeholder="+ GST 18% only (Including Breakfast)" className={inputClass} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={values.isComplimentary} onChange={(e) => update("isComplimentary", e.target.checked)} />
              Complimentary entry
            </label>
          </Section>

          <Section title="Panel background photo">
            <MediaUploadField
              label="Photo (optional)"
              name="backgroundPhotoUrl"
              kind="image"
              defaultValue={values.backgroundPhotoUrl}
              onValueChange={(value) => update("backgroundPhotoUrl", value)}
              helperText="Shown blurred behind the green panel. Leave blank to use BWF's standard chapter-meeting photo."
            />
          </Section>

          <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Invitation"}
            </button>
            {saveMessage ? <p className="text-sm text-neutral-600">{saveMessage}</p> : null}
            {isDirty && !saveMessage ? <p className="text-xs text-neutral-400">Unsaved changes</p> : null}
          </div>
        </div>

        {/* Preview & download */}
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 lg:sticky lg:top-6 lg:self-start">
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
          <p className="text-center text-xs text-neutral-500">
            {POSTER_WIDTH} × {POSTER_HEIGHT}px · 9:16, ready for WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-neutral-500">{hint}</span> : null}
    </label>
  );
}
