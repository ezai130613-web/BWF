import { recordChiefGuest } from "@/lib/member-activities/record";
import { listChiefGuests, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listChiefGuests);
export const POST = recordRoute(recordChiefGuest);
