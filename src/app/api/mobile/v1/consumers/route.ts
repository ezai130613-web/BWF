import { recordConsumer } from "@/lib/member-activities/record";
import { listConsumers, listRoute, recordRoute } from "@/lib/mobile/activities";

export const GET = listRoute(listConsumers);
export const POST = recordRoute(recordConsumer);
