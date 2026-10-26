import { computeMemberScore } from "@/lib/points/score";
import { json, mobileHandler, requireMobileMember } from "@/lib/mobile/api";
import type { PointsResponse } from "@/lib/mobile/contract";

export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const body: PointsResponse = await computeMemberScore(member.id);
  return json(body);
});
