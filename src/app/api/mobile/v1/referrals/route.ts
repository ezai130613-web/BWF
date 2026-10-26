import { recordReferral } from "@/lib/member-activities/record";
import { listReferrals, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listReferrals);
export const POST = recordRoute(recordReferral);
