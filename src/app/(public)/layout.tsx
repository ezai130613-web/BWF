import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppCta } from "@/components/layout/whatsapp-cta";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

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

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
    </>
  );
}
