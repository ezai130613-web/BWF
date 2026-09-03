import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logActivity } from "@/lib/audit";
import { buildMemberExportRows, toXlsxBuffer } from "@/lib/reports/member-export";

/**
 * Phase 13 (brief §46/§49) — the scheduled send Phase 9 deliberately left
 * unbuilt. Vercel Cron has no per-weekday granularity worth using (see
 * vercel.json — one daily entry), so this route itself checks
 * WeeklyReportSettings.dayOfWeek against today and no-ops otherwise, the
 * same "computed at read time, no bespoke scheduler" spirit as SCHEDULED
 * blog posts becoming visible lazily.
 *
 * Auth: Vercel signs its own cron requests with `Authorization: Bearer
 * $CRON_SECRET` — the same header doubles as the manual-trigger credential
 * for local verification, since there's no real Vercel Cron to fire this in
 * dev.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.weeklyReportSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.isEnabled) {
    return NextResponse.json({ skipped: "disabled" });
  }

  const today = new Date().getDay(); // 0 = Sunday .. 6 = Saturday, matches WeeklyReportSettings.dayOfWeek
  if (today !== settings.dayOfWeek) {
    return NextResponse.json({ skipped: "not scheduled today" });
  }

  const recipients = await db.weeklyReportRecipient.findMany({
    where: { isActive: true },
    include: { chapter: true },
  });

  let successCount = 0;
  let failureCount = 0;

  for (const recipient of recipients) {
    try {
      const chapterFilter = recipient.scope === "CHAPTER" && recipient.chapterId ? { chapterId: recipient.chapterId } : {};
      const scopeLabel = recipient.scope === "MASTER" ? "All Chapters" : (recipient.chapter?.name ?? "Chapter");

      // Default columns only, same as an on-demand export with nothing
      // extra selected — brief §44's "must not alter requested export
      // unless selected" extends naturally here (no per-recipient UI to
      // select extra columns from).
      const rows = await buildMemberExportRows(chapterFilter, false);
      const buffer = await toXlsxBuffer(rows, false, `Weekly Member Export — ${scopeLabel}`);

      await sendEmail({
        to: recipient.email,
        subject: `Weekly Member Export — ${scopeLabel}`,
        text: `Attached is the weekly member export for ${scopeLabel} — ${rows.length} member(s).`,
        attachments: [
          {
            filename: "weekly-member-export.xlsx",
            content: buffer,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      });

      successCount += 1;
    } catch (error) {
      console.error(`Weekly report send failed for ${recipient.email}:`, error);
      failureCount += 1;
    }
  }

  await logActivity({
    action: "weekly_report.sent",
    entity: "WeeklyReportRecipient",
    metadata: { recipientCount: recipients.length, successCount, failureCount },
  });

  return NextResponse.json({ sent: successCount, failed: failureCount });
}
