/**
 * Provider-agnostic transactional email (brief §5/§49 — must support
 * Resend/Postmark/SES without deep coupling). Only Resend is wired up as a
 * real provider so far, via a plain fetch call (no SDK dependency needed
 * for something this small). With no provider configured, email "sends"
 * by logging to the server console instead — good enough to fully exercise
 * the OTP login flow in local development without a real API key. This
 * must not be the fallback used in a deployed environment; wire up a real
 * EMAIL_API_KEY before staging/production sees real users.
 */

type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  /** Phase 13 — the weekly report send attaches its export file this way. */
  attachments?: EmailAttachment[];
};

async function sendViaResend(input: SendEmailInput) {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS ?? "Builders World Forum <no-reply@bwf.example>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

function sendViaConsole(input: SendEmailInput) {
  const attachmentLine = input.attachments?.length
    ? `\nAttachments: ${input.attachments.map((a) => a.filename).join(", ")}`
    : "";
  console.log(
    `\n[dev email — no EMAIL_PROVIDER configured]\nTo: ${input.to}\nSubject: ${input.subject}${attachmentLine}\n\n${input.text}\n`,
  );
}

export async function sendEmail(input: SendEmailInput) {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === "resend" && process.env.EMAIL_API_KEY) {
    await sendViaResend(input);
    return;
  }

  sendViaConsole(input);
}

/** Whether sendEmail() will actually deliver, vs. fall back to console logging. */
export function isEmailProviderConfigured() {
  return process.env.EMAIL_PROVIDER === "resend" && !!process.env.EMAIL_API_KEY;
}

export type BatchSendResult = { ok: true } | { ok: false; error: string };

const RESEND_BATCH_LIMIT = 100;

/**
 * Many separate emails (one per recipient — nobody sees anyone else's
 * address) in as few provider calls as possible (2026-10-03, meeting
 * reminders). Resend's batch endpoint takes up to 100 messages per call,
 * which also stays well inside its per-second rate limit for a whole
 * chapter. Never throws: each input gets its own result, in order.
 */
export async function sendEmailBatch(inputs: Omit<SendEmailInput, "attachments">[]): Promise<BatchSendResult[]> {
  if (!isEmailProviderConfigured()) {
    inputs.forEach(sendViaConsole);
    return inputs.map(() => ({ ok: true }));
  }

  const from = process.env.EMAIL_FROM_ADDRESS ?? "Builders World Forum <no-reply@bwf.example>";
  const results: BatchSendResult[] = [];
  for (let i = 0; i < inputs.length; i += RESEND_BATCH_LIMIT) {
    const chunk = inputs.slice(i, i + RESEND_BATCH_LIMIT);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((m) => ({ from, to: m.to, subject: m.subject, text: m.text }))),
      });
      if (!res.ok) {
        const error = `Resend batch failed (${res.status}): ${(await res.text()).slice(0, 300)}`;
        results.push(...chunk.map(() => ({ ok: false as const, error })));
      } else {
        results.push(...chunk.map(() => ({ ok: true as const })));
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : "Network error";
      results.push(...chunk.map(() => ({ ok: false as const, error })));
    }
  }
  return results;
}
