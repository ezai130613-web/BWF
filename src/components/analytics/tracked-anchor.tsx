"use client";

import { trackEvent } from "@/lib/analytics";

/**
 * A plain `<a>` (external links, tel:/mailto:/wa.me — Next's `Link` doesn't
 * apply to these) that also fires a GA4 event on click. The handler is
 * defined here, inside the client boundary — a Server Component parent
 * can't pass a function prop across to a Client Component, so this exists
 * specifically so server-rendered pages (member profiles, chapter pages)
 * can still get a tracked link without becoming client components themselves.
 */
export function TrackedAnchor({
  eventName,
  eventParams,
  ...props
}: { eventName: string; eventParams?: Record<string, unknown> } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={() => trackEvent(eventName, eventParams)} />;
}
