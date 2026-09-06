import OpenAI from "openai";

/**
 * OPENAI_API_KEY is deliberately NOT added to src/lib/env.ts's strict
 * schema (reserved for vars the app can't boot without). It's read directly
 * here, same "graceful no-op until configured" pattern as EMAIL_API_KEY
 * (src/lib/email.ts) and NEXT_PUBLIC_GA4_MEASUREMENT_ID — the chatbot ships
 * fully wired up and shows an honest "not available" state until a real key
 * is set.
 *
 * Switched from Anthropic/Claude to OpenAI 2026-09-06 (backlog #22) — the
 * user already had OpenAI credits provisioned and wanted to use those
 * rather than set up Anthropic billing. src/lib/chatbot/prompt.ts and
 * src/app/api/chatbot/route.ts changed accordingly; the retrieval/grounding
 * design itself (src/lib/chatbot/retrieval.ts) is provider-agnostic and
 * didn't need to change.
 */
export function isChatbotConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient(): OpenAI {
  // Reads OPENAI_API_KEY from the environment automatically.
  return new OpenAI();
}
