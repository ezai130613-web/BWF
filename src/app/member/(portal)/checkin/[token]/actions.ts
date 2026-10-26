"use server";

import { requireMemberProfile } from "@/lib/auth/rbac";
import { checkInMember, type CheckinState } from "@/lib/attendance/checkin";

export type { CheckinState };

/** See src/lib/attendance/checkin.ts. */
export async function checkIn(token: string, _prevState: CheckinState | undefined, formData: FormData): Promise<CheckinState> {
  const { member } = await requireMemberProfile();
  return checkInMember(member.id, token, formData);
}
