import { mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import { renderThankYouBadge } from "@/lib/thank-you-badge";

/** Mobile app "Download as image" for a Thank You Slip banner (2026-11-17) — bearer-authenticated PNG. */
export const GET = mobileHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { member } = await requireMobileMember(request);
  const { id } = await params;
  return renderThankYouBadge(id, member.id);
});
