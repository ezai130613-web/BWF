import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppCta } from "@/components/layout/whatsapp-cta";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppCta />
    </>
  );
}
