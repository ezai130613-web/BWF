import OpenAI from "openai";

/**
 * Script Writing workspace (2026-09-18 client correction) — "the OpenAI API
 * credentials have already been provided ... use the existing secure API
 * configuration rather than requesting credentials again." Reuses the
 * `OPENAI_API_KEY` env var set up for the now-removed Ask BWF chatbot
 * (see docs/ARCHITECTURE.md's Phase 12 section) — that feature's own client
 * code was deleted along with it, so this is a fresh, small wrapper, not a
 * revival of the old one. Never imported from a Client Component — every
 * caller is a Server Action, so the key never reaches the browser.
 */
const OPENAI_MODEL = process.env.OPENAI_SCRIPT_MODEL || process.env.OPENAI_CHATBOT_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `You are BWF's in-house marketing script-writing assistant, used by an authorised admin inside the Builders World Forum (a business networking forum for construction-industry professionals) marketing portal.
Help write and refine marketing scripts, social captions, and content ideas for Reels, posts, carousels, and videos. When asked, rewrite, shorten, expand, or otherwise revise existing scripts. Keep a professional but engaging tone suited to a B2B construction-industry audience. Keep responses focused on the requested content — don't pad with unrelated commentary.`;

let client: OpenAI | null = null;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function generateAssistantReply(history: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}
