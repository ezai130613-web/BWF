import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";

/**
 * Full Chief Guest list for signed-in members and admins (client correction
 * 2026-10-19), shown as compact name/company/designation/date bubbles instead
 * of the public photo carousel. A separate client-fetched route rather than
 * reading the session in ChiefGuestsSection, so the homepage and /chief-guest
 * stay statically cached for everyone else.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.mustActivate) {
    return NextResponse.json({ error: "Sign in to see the full Chief Guest list." }, { status: 401 });
  }

  const guests = await db.chiefGuest.findMany({
    where: { isPublished: true },
    orderBy: [{ visitedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, name: true, company: true, designation: true, visitedAt: true },
  });

  return NextResponse.json(
    {
      guests: guests.map((g) => ({
        id: g.id,
        name: g.name,
        company: g.company,
        designation: g.designation,
        visitedOn: g.visitedAt
          ? g.visitedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
          : null,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
