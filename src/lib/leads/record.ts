import { db } from "@/lib/db";
import type { $Enums } from "@/generated/prisma/client";

/**
 * Brief §35 — one Lead row per lead-generating event, alongside whatever
 * that flow already does. Never replaces a source's own specific record
 * (Visitor, MembershipApplication, ChatbotLead each keep their own detailed
 * model/admin page); this is purely the cross-source rollup brief §35's
 * field list and brief §39's "New leads" dashboard tile describe. See
 * docs/ARCHITECTURE.md for which of brief §35's 7 sources this actually
 * wires up vs. which have no real capture point on the site yet.
 *
 * Deliberately swallows its own errors rather than throwing — this rides
 * alongside a real registration/application/chatbot-capture flow, and a
 * missed Lead row is a strictly lesser problem than that flow's own success
 * response failing because of it.
 */
export async function recordLead(input: {
  source: $Enums.LeadSource;
  name: string;
  phone: string;
  email?: string | null;
  requirement?: string | null;
  memberId?: string | null;
  chapterId?: string | null;
  categoryId?: string | null;
}) {
  try {
    await db.lead.create({
      data: {
        source: input.source,
        name: input.name,
        phone: input.phone,
        email: input.email || undefined,
        requirement: input.requirement || undefined,
        memberId: input.memberId || undefined,
        chapterId: input.chapterId || undefined,
        categoryId: input.categoryId || undefined,
      },
    });
  } catch (error) {
    console.error("recordLead failed:", error);
  }
}
