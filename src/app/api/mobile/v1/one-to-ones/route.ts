import { recordOneToOne } from "@/lib/member-activities/record";
import { listOneToOnes, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listOneToOnes);
export const POST = recordRoute(recordOneToOne);
