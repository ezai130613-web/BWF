"use server";

import { requireMemberProfile } from "@/lib/auth/rbac";
import { submitMemberPaymentFor, type MemberPaymentState } from "@/lib/payments/submit";

export type { MemberPaymentState };

/** See src/lib/payments/submit.ts. */
export async function submitMemberPayment(
  type: "MEETING" | "MEMBERSHIP",
  _prevState: MemberPaymentState | undefined,
  formData: FormData,
): Promise<MemberPaymentState> {
  const { member } = await requireMemberProfile();
  return submitMemberPaymentFor(member.id, type, formData);
}
