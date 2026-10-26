import { recordThankYouSlip } from "@/lib/member-activities/record";
import { listThankYouSlips, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listThankYouSlips);
export const POST = recordRoute(recordThankYouSlip);
