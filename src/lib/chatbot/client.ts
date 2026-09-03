import Anthropic from "@anthropic-ai/sdk";

/**
 * ANTHROPIC_API_KEY is deliberately NOT added to src/lib/env.ts's strict
 * schema (reserved for vars the app can't boot without). It's read directly
 * here, same "graceful no-op until configured" pattern as EMAIL_API_KEY
 * (src/lib/email.ts) and NEXT_PUBLIC_GA4_MEASUREMENT_ID — the chatbot ships
 * fully wired up and shows an honest "not available" state until a real key
 * is set.
 */
export function isChatbotConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment automatically.
  return new Anthropic();
}
