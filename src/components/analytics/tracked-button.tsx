"use client";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

/** Same reasoning as TrackedAnchor — wraps Button so a Server Component can render a tracked "Apply for Membership" CTA without itself needing "use client". */
export function TrackedButton({
  eventName,
  eventParams,
  ...props
}: { eventName: string; eventParams?: Record<string, unknown> } & React.ComponentProps<typeof Button>) {
  return <Button {...props} onClick={() => trackEvent(eventName, eventParams)} />;
}
