import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/** Renders nothing until NEXT_PUBLIC_GA4_MEASUREMENT_ID is set — same "no dead script tags ship" rule WhatsAppCta already follows (Phase 1). */
export function GoogleAnalytics() {
  if (!GA4_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
      </Script>
    </>
  );
}
