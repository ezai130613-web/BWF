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

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
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
    body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

function sendViaConsole(input: SendEmailInput) {
  console.log(
    `\n[dev email — no EMAIL_PROVIDER configured]\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n`,
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
