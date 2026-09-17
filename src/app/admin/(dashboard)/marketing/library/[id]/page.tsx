import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ScheduleComposer } from "@/components/admin/schedule-composer";
import { ScheduledPostCard } from "@/components/admin/scheduled-post-card";
import { DeleteMarketingContentButton } from "@/components/admin/delete-marketing-content-button";
import { EditMarketingContentForm } from "@/components/admin/edit-marketing-content-form";

export default async function MarketingContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("marketing:manage");
  const { id } = await params;

  const content = await db.marketingContent.findUnique({
    where: { id },
    include: { scheduledPosts: { orderBy: { scheduledFor: "asc" } } },
  });
  if (!content) notFound();

  const alreadyScheduled = content.scheduledPosts.map((p) => p.platform);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{content.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">Uploaded {content.createdAt.toLocaleDateString()}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-3">
          {content.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- R2 URL, not a next/image-managed asset
            <img src={content.thumbnailUrl} alt="" className="w-full rounded-lg border border-neutral-200 object-cover" />
          ) : null}
          <a href={content.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-neutral-600 underline hover:text-neutral-900">
            View uploaded video →
          </a>
          {content.script ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Script / caption</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{content.script}</p>
            </div>
          ) : null}
          {content.notes ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Internal notes</p>
              <p className="mt-1 text-sm text-neutral-600">{content.notes}</p>
            </div>
          ) : null}
          <EditMarketingContentForm content={content} />
          {content.scheduledPosts.length === 0 ? <DeleteMarketingContentButton contentId={content.id} /> : null}
        </div>

        <div className="flex flex-col gap-6">
          {content.scheduledPosts.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-neutral-900">Scheduled to</h2>
              {content.scheduledPosts.map((post) => (
                <ScheduledPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}

          {/* Keyed on the already-scheduled set so a successful schedule
              remounts this component fresh (see ScheduleComposer's own
              comment) instead of it needing an effect to reset itself. */}
          <ScheduleComposer
            key={alreadyScheduled.join(",")}
            contentId={content.id}
            alreadyScheduled={alreadyScheduled}
            initialScript={content.script}
          />
        </div>
      </div>
    </div>
  );
}
