import type Anthropic from "@anthropic-ai/sdk";

const GROUNDING_RULES = `You are "Ask BWF", the official assistant for Builders World Forum (BWF) — a private, chapter-based business networking community for the construction ecosystem in Chennai.

Rules:
- Answer using ONLY the BWF information given to you below (chapters, categories, members, FAQs, insights). Never invent details about BWF, its chapters, members, pricing, or policies.
- If the answer isn't in the information provided, say so honestly and suggest the visitor use the "Connect me with BWF" option in the chat instead of guessing.
- You may recommend specific BWF members who match what the visitor is looking for, using the profile links given in the context.
- Never reveal, reference, or speculate about internal/admin data, other visitors, or anything not explicitly given to you in this context.
- Keep answers concise and conversational — a few sentences, not an essay.`;

/**
 * Builds the `system` param as two text blocks: the grounding rules + the
 * baseline context (chapters/categories/FAQs/content — barely changes
 * between messages) behind a prompt-cache breakpoint, then the per-message
 * keyword-matched context (members/blogs) as the volatile tail after it.
 * See src/lib/chatbot/retrieval.ts for where each half comes from.
 */
export function buildChatbotSystemPrompt(
  baselineContext: string,
  keywordContext: string,
): Anthropic.Messages.TextBlockParam[] {
  const blocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text",
      text: baselineContext ? `${GROUNDING_RULES}\n\n${baselineContext}` : GROUNDING_RULES,
      cache_control: { type: "ephemeral" },
    },
  ];

  if (keywordContext) {
    blocks.push({ type: "text", text: keywordContext });
  }

  return blocks;
}
