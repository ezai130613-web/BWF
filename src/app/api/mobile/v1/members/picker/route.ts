import { getPickerMembers } from "@/lib/members/picker";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { PickerMembersResponse } from "@/lib/mobile/contract";

/** Chapter → Category → Member picker data (no contact details), same as the portal's. */
export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const body: PickerMembersResponse = { members: await getPickerMembers(member.id) };
  return json(body);
});
