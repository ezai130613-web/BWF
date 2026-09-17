"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/audit";
import { istInputsToUtcDate } from "@/lib/marketing/constants";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((v) => v || undefined);

function revalidateMarketing() {
  revalidatePath("/admin/marketing");
  revalidatePath("/admin/marketing/library");
  revalidatePath("/admin/marketing/library/[id]", "page");
  revalidatePath("/admin/marketing/calendar");
  revalidatePath("/admin/marketing/history");
}

// --- Content library -------------------------------------------------------

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  videoUrl: z.string().min(1, "A video is required"),
  thumbnailUrl: optionalText(),
  notes: optionalText(),
});

export async function createMarketingContent(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = contentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const content = await db.marketingContent.create({ data: parsed.data });

  await logActivity({ action: "marketing_content.created", entity: "MarketingContent", entityId: content.id });
  revalidateMarketing();
  return { error: undefined };
}

const updateContentSchema = contentSchema.extend({ contentId: z.string() });

export async function updateMarketingContent(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = updateContentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { contentId, ...rest } = parsed.data;
  await db.marketingContent.update({ where: { id: contentId }, data: rest });

  await logActivity({ action: "marketing_content.updated", entity: "MarketingContent", entityId: contentId });
  revalidateMarketing();
  return { error: undefined };
}

/**
 * Only ever offered in the UI when the content has zero ScheduledPost rows
 * (see the Library page) — MarketingContent → ScheduledPost is `onDelete:
 * Restrict` specifically so real Publishing History can't be silently wiped
 * out by deleting the content it's about.
 */
export async function deleteMarketingContent(contentId: string) {
  await requirePermission("marketing:manage");
  await db.marketingContent.delete({ where: { id: contentId } });
  await logActivity({ action: "marketing_content.deleted", entity: "MarketingContent", entityId: contentId });
  revalidateMarketing();
}

// --- Scheduling --------------------------------------------------------

const platformEnum = z.enum(["INSTAGRAM", "FACEBOOK", "YOUTUBE", "PINTEREST"]);

const postEntrySchema = z.object({
  platform: platformEnum,
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  title: z.string().optional(),
  destinationLink: z.string().optional(),
  boardId: z.string().optional(),
  boardName: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
});

const scheduleSchema = z.object({
  contentId: z.string(),
  posts: z.array(postEntrySchema).min(1, "Select at least one platform"),
});

/**
 * The brief's "Confirm & Schedule" action — one ScheduledPost row per
 * selected platform, each with its own caption/title/date/time (brief §6-7).
 * The client-side composer (ScheduleComposer) owns the multi-step UI and
 * submits the whole payload as one JSON blob, same pattern as the Roster
 * Sheet wizard's client-owned state / single-save-call design.
 *
 * Batch 1 note: this persists real schedule intent, but nothing actually
 * publishes yet — Batch 3 adds the cron-driven worker that reads
 * `status: SCHEDULED` rows past their `scheduledFor` time. "Publish Now"
 * from the brief is represented here as `scheduledFor = now`, not a
 * synchronous publish call — same honesty-over-fabricated-automation
 * precedent as the Weekly Report cron built ahead of its sender.
 */
export async function createScheduledPosts(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Malformed schedule payload." };
  }

  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const connections = await db.platformConnection.findMany();
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c.id]));

  await db.scheduledPost.createMany({
    data: parsed.data.posts.map((post) => ({
      contentId: parsed.data.contentId,
      platform: post.platform,
      connectionId: connectionByPlatform.get(post.platform) ?? null,
      status: "SCHEDULED" as const,
      caption: post.caption || undefined,
      hashtags: post.hashtags || undefined,
      title: post.title || undefined,
      destinationLink: post.destinationLink || undefined,
      boardId: post.boardId || undefined,
      boardName: post.boardName || undefined,
      scheduledFor: istInputsToUtcDate(post.date, post.time),
    })),
  });

  await logActivity({
    action: "marketing_scheduled_posts.created",
    entity: "MarketingContent",
    entityId: parsed.data.contentId,
    metadata: { platforms: parsed.data.posts.map((p) => p.platform) },
  });
  revalidateMarketing();
  return { error: undefined };
}

const updatePostSchema = z.object({
  scheduledPostId: z.string(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  title: z.string().optional(),
  destinationLink: z.string().optional(),
  boardId: z.string().optional(),
  boardName: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
});

export async function updateScheduledPost(_prevState: { error?: string } | undefined, formData: FormData) {
  await requirePermission("marketing:manage");

  const parsed = updatePostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { scheduledPostId, date, time, ...rest } = parsed.data;

  const existing = await db.scheduledPost.findUnique({ where: { id: scheduledPostId } });
  if (!existing) return { error: "This scheduled post no longer exists." };
  if (existing.status === "PUBLISHING" || existing.status === "PUBLISHED") {
    return { error: "This post can no longer be edited — it has already published or is publishing right now." };
  }

  await db.scheduledPost.update({
    where: { id: scheduledPostId },
    data: {
      caption: rest.caption || undefined,
      hashtags: rest.hashtags || undefined,
      title: rest.title || undefined,
      destinationLink: rest.destinationLink || undefined,
      boardId: rest.boardId || undefined,
      boardName: rest.boardName || undefined,
      scheduledFor: istInputsToUtcDate(date, time),
    },
  });

  await logActivity({ action: "marketing_scheduled_post.updated", entity: "ScheduledPost", entityId: scheduledPostId });
  revalidateMarketing();
  return { error: undefined };
}

/** Only allowed before publishing has started (brief §9 — "edit or cancel scheduled posts before they are published"). */
export async function cancelScheduledPost(scheduledPostId: string) {
  await requirePermission("marketing:manage");

  const existing = await db.scheduledPost.findUnique({ where: { id: scheduledPostId } });
  if (!existing || existing.status === "PUBLISHING" || existing.status === "PUBLISHED") return;

  await db.scheduledPost.delete({ where: { id: scheduledPostId } });
  await logActivity({ action: "marketing_scheduled_post.cancelled", entity: "ScheduledPost", entityId: scheduledPostId });
  revalidateMarketing();
}

/**
 * Brief §8 — "Provide a Retry option for failed posts." Resets the post to
 * SCHEDULED with `scheduledFor = now` so Batch 3's worker picks it up on its
 * next tick; inert until that worker exists, same Batch 1 caveat as
 * createScheduledPosts above.
 */
export async function retryScheduledPost(scheduledPostId: string) {
  await requirePermission("marketing:manage");

  const existing = await db.scheduledPost.findUnique({ where: { id: scheduledPostId } });
  if (!existing || (existing.status !== "FAILED" && existing.status !== "ACTION_REQUIRED")) return;

  await db.scheduledPost.update({
    where: { id: scheduledPostId },
    data: { status: "SCHEDULED", scheduledFor: new Date(), lastError: null },
  });
  await logActivity({ action: "marketing_scheduled_post.retried", entity: "ScheduledPost", entityId: scheduledPostId });
  revalidateMarketing();
}
