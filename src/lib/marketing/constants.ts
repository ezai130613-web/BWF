import type {
  CalendarPlatform,
  ContentFormat,
  ContentPlanStatus,
  MarketingPlatform,
  ScheduledPostStatus,
  ScriptStatus,
} from "@/generated/prisma/client";

/**
 * Marketing module (2026-09-16 client brief) — platform metadata shared
 * between the Schedule composer, Calendar, and History views. Field
 * applicability (hashtags/title/board/destination link) reflects what each
 * platform's official publishing API actually accepts — see
 * docs/ARCHITECTURE.md's verified platform research — not a guess.
 */
export const PLATFORMS: readonly MarketingPlatform[] = ["INSTAGRAM", "FACEBOOK", "YOUTUBE", "PINTEREST"];

export const PLATFORM_LABELS: Record<MarketingPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  PINTEREST: "Pinterest",
};

export const PLATFORM_FIELDS: Record<
  MarketingPlatform,
  {
    captionLabel: string;
    hasHashtags: boolean;
    hasTitle: boolean;
    titleLabel: string;
    hasDestinationLink: boolean;
    hasBoard: boolean;
    formatNote: string;
  }
> = {
  INSTAGRAM: {
    captionLabel: "Caption",
    hasHashtags: true,
    hasTitle: false,
    titleLabel: "",
    hasDestinationLink: false,
    hasBoard: false,
    formatNote: "Reel — 5–90s, 9:16 preferred, MP4/MOV, up to 1GB.",
  },
  FACEBOOK: {
    captionLabel: "Caption",
    hasHashtags: true,
    hasTitle: false,
    titleLabel: "",
    hasDestinationLink: false,
    hasBoard: false,
    formatNote: "Reel or video post, MP4/MOV.",
  },
  YOUTUBE: {
    captionLabel: "Description",
    hasHashtags: true,
    hasTitle: true,
    titleLabel: "Video title",
    hasDestinationLink: false,
    hasBoard: false,
    formatNote: "Shorts (vertical, ≤3 min, auto-detected) or a regular video.",
  },
  PINTEREST: {
    captionLabel: "Description",
    hasHashtags: false,
    hasTitle: true,
    titleLabel: "Pin title",
    hasDestinationLink: true,
    hasBoard: true,
    formatNote: "Video Pin, up to 2GB.",
  },
};

export const STATUS_LABELS: Record<ScheduledPostStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHING: "Publishing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  ACTION_REQUIRED: "Action Required",
};

export const STATUS_BADGE_CLASSES: Record<ScheduledPostStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  SCHEDULED: "bg-blue-50 text-blue-700",
  PUBLISHING: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  ACTION_REQUIRED: "bg-orange-50 text-orange-700",
};

/**
 * IST has no DST, so a fixed +05:30 offset is all this needs — no timezone
 * library. Brief §7: "All times should default to IST, with the timezone
 * clearly displayed."
 */
export function istInputsToUtcDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00+05:30`);
}

export function formatIst(date: Date): string {
  return (
    date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST"
  );
}

/** For pre-filling a datetime-local-style split date/time input with the IST wall-clock value. */
export function toIstDateTimeInputs(date: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

// --- Content Calendar & Script Writing (2026-09-18 client correction) ------

export const CONTENT_FORMATS: readonly ContentFormat[] = ["REEL", "POST", "CAROUSEL", "STORY", "VIDEO", "OTHER"];

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  REEL: "Reel",
  POST: "Post",
  CAROUSEL: "Carousel",
  STORY: "Story",
  VIDEO: "Video",
  OTHER: "Other",
};

export const CALENDAR_PLATFORMS: readonly CalendarPlatform[] = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE", "OTHER"];

export const CALENDAR_PLATFORM_LABELS: Record<CalendarPlatform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
  OTHER: "Other",
};

export const CONTENT_PLAN_STATUSES: readonly ContentPlanStatus[] = ["PLANNED", "IN_PROGRESS", "READY", "SCHEDULED", "PUBLISHED"];

export const CONTENT_PLAN_STATUS_LABELS: Record<ContentPlanStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  READY: "Ready",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

export const CONTENT_PLAN_STATUS_BADGE_CLASSES: Record<ContentPlanStatus, string> = {
  PLANNED: "bg-neutral-100 text-neutral-600",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  READY: "bg-purple-50 text-purple-700",
  SCHEDULED: "bg-blue-50 text-blue-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
};

export const SCRIPT_STATUSES: readonly ScriptStatus[] = ["DRAFT", "FINALISED"];

export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  DRAFT: "Draft",
  FINALISED: "Finalised",
};

export const SCRIPT_STATUS_BADGE_CLASSES: Record<ScriptStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-600",
  FINALISED: "bg-emerald-50 text-emerald-700",
};

/** "Script 001" style display — never entered by the admin, see MarketingScript.scriptNumber. */
export function formatScriptNumber(n: number): string {
  return `Script ${String(n).padStart(3, "0")}`;
}
