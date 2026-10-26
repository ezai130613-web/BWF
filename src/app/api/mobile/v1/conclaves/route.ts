import { recordConclave } from "@/lib/member-activities/record";
import { listConclaves, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listConclaves);
export const POST = recordRoute(recordConclave);
