import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { isChatbotConfigured, getAnthropicClient } from "@/lib/chatbot/client";
import { getBaselineChatbotContext, getKeywordMatchedChatbotContext } from "@/lib/chatbot/retrieval";
import { buildChatbotSystemPrompt } from "@/lib/chatbot/prompt";
import { rateLimit, getClientIp, TOO_MANY_REQUESTS_ERROR } from "@/lib/rate-limit";

/** Bounds how long any single conversation can run — separate from the
 * per-IP velocity limit below (Phase 14), which catches a single client
 * firing many short conversations rather than one long one. */
const MAX_MESSAGES_PER_CONVERSATION = 40;

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
});

type ChatMessage = { role: "user" | "assistant"; content: string; at: string };

function isChatMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value);
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { sessionId, message } = parsed.data;

  // Settings row always exists (seeded), but upsert defensively — same
  // pattern as the Weekly Reports admin page.
  const settings = await db.chatbotSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  if (!settings.isEnabled || !isChatbotConfigured()) {
    // Not an error — the widget renders an honest "not available" state for this.
    return NextResponse.json({ unavailable: true });
  }

  const ip = await getClientIp();
  const withinRate = await rateLimit(`chatbot:${ip}`, { limit: 20, windowSeconds: 600 });
  if (!withinRate) {
    return NextResponse.json({ error: TOO_MANY_REQUESTS_ERROR }, { status: 429 });
  }

  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  const conversation = await db.chatbotConversation.upsert({
    where: { sessionId },
    update: {},
    create: { sessionId, userId: session?.user?.id ?? null, messages: [] },
  });

  const history = isChatMessageArray(conversation.messages) ? conversation.messages : [];

  if (settings.accessMode === "LOGIN_REQUIRED" && !isAuthenticated) {
    return NextResponse.json({ error: "Please sign in to use Ask BWF." }, { status: 401 });
  }

  if (settings.accessMode === "LIMITED_FREE_QUESTIONS" && !isAuthenticated) {
    const userMessageCount = history.filter((m) => m.role === "user").length;
    if (userMessageCount >= settings.freeQuestionsLimit) {
      return NextResponse.json(
        { error: "You've used your free questions — please sign in to continue chatting." },
        { status: 401 },
      );
    }
  }

  if (history.length >= MAX_MESSAGES_PER_CONVERSATION) {
    return NextResponse.json(
      { error: "This conversation has reached its limit — please start a new one." },
      { status: 429 },
    );
  }

  const [baselineContext, keywordContext] = await Promise.all([
    getBaselineChatbotContext(),
    getKeywordMatchedChatbotContext(message),
  ]);

  const system = buildChatbotSystemPrompt(baselineContext, keywordContext);

  const client = getAnthropicClient();
  const anthropicMessages: Anthropic.Messages.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 2048,
    system,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    messages: anthropicMessages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";

      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }

        const now = new Date().toISOString();
        const updatedMessages: ChatMessage[] = [
          ...history,
          { role: "user", content: message, at: now },
          { role: "assistant", content: assistantText, at: now },
        ];
        await db.chatbotConversation.update({
          where: { id: conversation.id },
          data: { messages: updatedMessages, userId: session?.user?.id ?? conversation.userId },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (error) {
        console.error("Ask BWF stream error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
