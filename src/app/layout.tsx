import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Builders World Forum",
    template: "%s | Builders World Forum",
  },
  description:
    "Builders World Forum is a private, chapter-based business community for Chennai's construction ecosystem.",
  // Google Search Console site-verification (brief §50) — unset until BWF's
  // real GSC property exists; Next omits the meta tag entirely when there's
  // nothing to verify, same "no dead tag ships" rule as GA4/WhatsApp.
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-navy-900 font-sans text-ivory-100">
        {children}
      </body>
    </html>
  );
}
