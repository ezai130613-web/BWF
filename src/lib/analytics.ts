/**
 * Brief §50 — GA4 custom event tracking. A thin wrapper around `gtag`, not a
 * full analytics SDK: no-ops silently if GA4 isn't configured
 * (`NEXT_PUBLIC_GA4_MEASUREMENT_ID` unset — see `GoogleAnalytics` component)
 * or hasn't loaded yet, so every call site stays safe to use unconditionally
 * without checking for GA4 first. Page views (member profiles, blog posts —
 * brief §50's "Blog performance"/"Member page views") are covered by GA4's
 * own automatic pageview tracking and need no code here.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}
