import { z } from "zod";
import { db } from "@/lib/db";
import { MEMBER_PROFILE_FIELD_LABELS } from "@/lib/members/profile-fields";
import { currentProfileFormValues, submitProfileRevision } from "@/lib/members/profile-revision";
import { getMemberSummary } from "@/lib/mobile/account";
import { invalid, json, mobileHandler, readJson, requireMobileMember } from "@/lib/mobile/api";
import type { ProfileFieldKey, ProfileResponse } from "@/lib/mobile/contract";

/** The text fields the app lets a member propose changes to. Media, galleries and map location stay web-only for now. */
const APP_EDITABLE_FIELDS: ProfileFieldKey[] = [
  "name",
  "designation",
  "bio",
  "email",
  "phone",
  "whatsapp",
  "website",
  "address",
  "services",
  "specialisations",
  "usp",
  "yearsInBusiness",
  "areasServed",
  "certifications",
  "majorProjects",
  "clientele",
  "instagramUrl",
  "linkedinUrl",
  "facebookUrl",
  "youtubeUrl",
];

export const GET = mobileHandler(async (request: Request) => {
  const { member } = await requireMobileMember(request);
  const [summary, pending] = await Promise.all([
    getMemberSummary(member.id),
    db.memberProfileRevision.findFirst({ where: { memberId: member.id, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
  ]);
  const current = currentProfileFormValues(member);

  const body: ProfileResponse = {
    member: summary,
    fields: Object.fromEntries(APP_EDITABLE_FIELDS.map((k) => [k, current[k] ?? ""])) as ProfileResponse["fields"],
    labels: Object.fromEntries(APP_EDITABLE_FIELDS.map((k) => [k, MEMBER_PROFILE_FIELD_LABELS[k]])) as ProfileResponse["labels"],
    pendingEdit: pending ? { submittedAt: pending.createdAt.toISOString() } : null,
  };
  return json(body);
});

const bodySchema = z.object({ fields: z.record(z.string(), z.string().max(5000)) });

/** Proposes an edit — creates a PENDING revision for admin review, never edits the profile directly (brief §20). */
export const POST = mobileHandler(async (request: Request) => {
  const { user, member } = await requireMobileMember(request);
  const { fields } = await readJson(request, bodySchema);

  const proposed = currentProfileFormValues(member);
  for (const key of APP_EDITABLE_FIELDS) {
    if (typeof fields[key] === "string") proposed[key] = fields[key];
  }

  const result = await submitProfileRevision({ userId: user.id, memberId: member.id }, proposed);
  if (!result.ok) throw invalid(result.error);
  return json({ ok: true, id: result.id }, 201);
});
