/**
 * Phase 38 (2026-10-26) — WhatsApp messages via Meta's official WhatsApp
 * Cloud API (graph.facebook.com), same "plain fetch, no SDK" approach as
 * src/lib/email.ts. Business-initiated WhatsApp messages must use a
 * template Meta has approved in advance — the templates this app sends are
 * defined in WHATSAPP_TEMPLATES below, with the exact body text to submit in
 * WhatsApp Manager (also listed in docs/ARCHITECTURE.md).
 *
 * Switched by WHATSAPP_PROVIDER, like EMAIL_PROVIDER:
 *  - "meta"    → real sends; needs WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 *               (optional WHATSAPP_GRAPH_VERSION, WHATSAPP_TEMPLATE_LANGUAGE).
 *  - "console" → local development: logs the message instead of sending.
 *  - unset     → WhatsApp is off; callers skip the channel entirely (no log
 *               rows), so email keeps working exactly as before.
 *
 * "Sent" means Meta accepted the message — delivery/read receipts would need
 * a webhook, which isn't built yet.
 */

export type WhatsAppTemplateKey = "meetingReminder" | "absenceWarning";

type TemplateSpec = {
  /** Template name as registered in WhatsApp Manager. */
  name: string;
  /** Body text to submit for approval — {{n}} are filled from `params` in order. */
  body: string;
  paramCount: number;
};

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, TemplateSpec> = {
  meetingReminder: {
    name: "bwf_meeting_reminder",
    body:
      "Hello {{1}}, this is a reminder that your Builders World Forum {{2}} meeting is in 2 days. " +
      "Meeting: {{3}}. Date: {{4}}. Time: {{5}}. Venue: {{6}}. " +
      "Please bring your referrals, thank you slips and one-to-one updates. - Builders World Forum",
    paramCount: 6,
  },
  absenceWarning: {
    name: "bwf_absence_warning",
    body:
      "Hello {{1}}, our records show you were absent from the last {{2}} {{3}} meetings ({{4}}). " +
      "Regular attendance is part of BWF membership. If you miss the next meeting, your membership will be referred to the BWF admin team for review. " +
      "If there is a reason, such as a medical issue, please let your chapter know. - Builders World Forum",
    paramCount: 4,
  },
};

export type WhatsAppSendResult = { ok: true; messageId: string | null } | { ok: false; error: string };

export function whatsAppMode(): "meta" | "console" | "off" {
  const provider = process.env.WHATSAPP_PROVIDER;
  if (provider === "meta" && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) return "meta";
  if (provider === "console") return "console";
  return "off";
}

/** Whether WhatsApp messages go anywhere at all (real or dev console). */
export function isWhatsAppEnabled() {
  return whatsAppMode() !== "off";
}

/**
 * A member's WhatsApp number in the digits-only international form the
 * Cloud API wants ("919876543210"). Bare 10-digit numbers are Indian
 * mobiles (+91); a leading 0 trunk prefix is dropped. Anything that can't
 * be a mobile number → null.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) {
    return /^[6-9]/.test(digits) ? `91${digits}` : null;
  }
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

/** Template parameters can't contain newlines, tabs or 4+ spaces in a row (Meta rejects the send). */
function cleanParam(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim() || "-";
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  template: WhatsAppTemplateKey;
  params: string[];
}): Promise<WhatsAppSendResult> {
  const spec = WHATSAPP_TEMPLATES[input.template];
  if (input.params.length !== spec.paramCount) {
    return { ok: false, error: `Template ${spec.name} needs ${spec.paramCount} values, got ${input.params.length}.` };
  }
  const params = input.params.map(cleanParam);
  const mode = whatsAppMode();

  if (mode === "off") return { ok: false, error: "WhatsApp is not configured." };

  if (mode === "console") {
    let text = spec.body;
    params.forEach((p, i) => (text = text.replace(`{{${i + 1}}}`, p)));
    console.log(`\n[dev WhatsApp — WHATSAPP_PROVIDER=console]\nTo: +${input.to}\nTemplate: ${spec.name}\n\n${text}\n`);
    return { ok: true, messageId: null };
  }

  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to,
        type: "template",
        template: {
          name: spec.name,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    const body = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: { message?: string; code?: number } } | null;
    if (!res.ok) {
      return { ok: false, error: `WhatsApp send failed (${res.status}${body?.error?.code ? `/${body.error.code}` : ""}): ${body?.error?.message ?? "unknown error"}`.slice(0, 300) };
    }
    return { ok: true, messageId: body?.messages?.[0]?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Sends many template messages with a little parallelism; never throws, one result per input, in order. */
export async function sendWhatsAppTemplates(
  inputs: { to: string; template: WhatsAppTemplateKey; params: string[] }[],
  concurrency = 5,
): Promise<WhatsAppSendResult[]> {
  const results: WhatsAppSendResult[] = new Array(inputs.length);
  let next = 0;
  async function worker() {
    while (next < inputs.length) {
      const i = next++;
      results[i] = await sendWhatsAppTemplate(inputs[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, worker));
  return results;
}
