import { requireMemberProfile } from "@/lib/auth/rbac";
import { renderThankYouBadge } from "@/lib/thank-you-badge";

/** Website "Download as image" for a Thank You Slip banner (2026-11-17). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { member } = await requireMemberProfile();
  const { id } = await params;
  return renderThankYouBadge(id, member.id);
}
