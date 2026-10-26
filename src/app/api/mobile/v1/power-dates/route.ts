import { recordPowerDate } from "@/lib/member-activities/record";
import { listPowerDates, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listPowerDates);
export const POST = recordRoute(recordPowerDate);
