import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppCta } from "@/components/layout/whatsapp-cta";
import { AskBwfLauncher } from "@/components/layout/ask-bwf-launcher";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/db";

// Brief §53 — Organization schema, site-wide. Scoped to the public surface
// only (not admin/member) — brief §50's whole analytics/schema section is
// about the public marketing site, and there's no reason for internal admin
// usage to carry public tracking scripts or business schema.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Builders World Forum",
  url: SITE_URL,
  description:
    "A private, chapter-based business community for Chennai's construction ecosystem.",
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // No dead entry point ships — same rule as WhatsAppCta/GoogleAnalytics —
  // but gated on isEnabled alone, not isChatbotConfigured() too: an admin
  // can legitimately enable the widget before ANTHROPIC_API_KEY exists (the
  // settings page warns about exactly this), and /api/chatbot itself reports
  // "unavailable" for the widget to show honestly in that case — the two
  // checks aren't redundant, they cover different moments. Plain findUnique,
  // not upsert — this layout wraps every public page, so a write on every
  // render would add needless load; a missing row (shouldn't happen, seeded)
  // just means "not enabled yet".
  const chatbotSettings = await db.chatbotSettings.findUnique({ where: { id: "singleton" } });
  const showChatbot = chatbotSettings?.isEnabled ?? false;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <GoogleAnalytics />
      <JsonLd data={organizationJsonLd} />
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppCta />
      {showChatbot ? <AskBwfLauncher /> : null}
    </>
  );
}
