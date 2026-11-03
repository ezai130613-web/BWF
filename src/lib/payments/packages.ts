import { getContent } from "@/lib/content";
import { MEETING_PACKAGES_KEY, parseMeetingPackages, type MeetingPackage } from "@/lib/payments/fees";

/** The admin's meeting packages (Website Content → Fees), or the defaults until they're saved. Server-only. */
export async function getMeetingPackages(): Promise<MeetingPackage[]> {
  const content = await getContent([MEETING_PACKAGES_KEY]);
  return parseMeetingPackages(content[MEETING_PACKAGES_KEY]);
}
