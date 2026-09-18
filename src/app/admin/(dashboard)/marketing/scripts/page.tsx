import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ScriptWritingWorkspace } from "@/components/admin/script-writing-workspace";

/**
 * Script Writing (2026-09-18 client correction, brief §5) — a separate page
 * from Content Creation, an in-house AI chat workspace (OpenAI, via a
 * Server Action only — see src/lib/marketing/openai.ts) plus "My Scripts."
 * §5E — access is `marketing:manage`, the same permission that already
 * gates the whole Marketing Portal (Super/Central Admin only); enforced
 * here and again inside every action in `actions.ts`, not just by this page
 * not being linked from anywhere else.
 */
export default async function ScriptWritingPage({
  searchParams,
}: {
  searchParams: Promise<{ conversationId?: string }>;
}) {
  await requirePermission("marketing:manage");
  const { conversationId: requestedConversationId } = await searchParams;

  const [conversations, scripts] = await Promise.all([
    db.aiConversation.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, title: true, updatedAt: true } }),
    db.marketingScript.findMany({ orderBy: { updatedAt: "desc" } }),
  ]);

  const activeConversationId = requestedConversationId && conversations.some((c) => c.id === requestedConversationId) ? requestedConversationId : null;

  const initialMessages = activeConversationId
    ? await db.aiMessage.findMany({ where: { conversationId: activeConversationId }, orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Script Writing</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Chat with the AI assistant to draft and refine scripts, captions, and content ideas — save any reply straight into My Scripts below.
        </p>
      </div>

      <ScriptWritingWorkspace
        conversations={conversations}
        activeConversationId={activeConversationId}
        initialMessages={initialMessages}
        scripts={scripts}
      />
    </div>
  );
}
