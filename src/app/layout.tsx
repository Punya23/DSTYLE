import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/store/NavBar";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";
import { AuthModal } from "@/components/store/AuthModal";
import { ConditionalChrome } from "@/components/store/ConditionalChrome";
import { SmoothScrollProvider } from "@/components/store/SmoothScrollProvider";
import { Providers } from "./providers";
import { JsonLd } from "@/components/JsonLd";
import { SITE, absoluteUrl } from "@/lib/seo";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const HOME_DESCRIPTION =
  "Hand-embroidered bridal, festive, cocktail and pret couture — crafted in our Mumbai atelier.";

export const metadata: Metadata = {
  // Every relative URL in page metadata (canonicals, OG images) resolves
  // against this, so it must be the real deployed origin in production.
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["Indian fashion", "designer wear", "bridal", "couture", "lehenga", "saree", "Dstyle"],
  authors: [{ name: SITE.name, url: absoluteUrl("/") }],
  creator: SITE.name,
  publisher: SITE.legalName,
  category: "shopping",
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    locale: SITE.locale,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: HOME_DESCRIPTION,
  },
  alternates: { canonical: absoluteUrl("/") },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google show full-size image previews and untruncated snippets —
      // both matter for a visual catalogue.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#17130f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable}`}
      style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      <body className="antialiased bg-brand-ivory text-brand-ink w-full overflow-x-clip">
        {/* Site-wide identity graph. Page-level schemas reference these by @id
            rather than repeating the publisher on every route. */}
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <Providers>
          <SmoothScrollProvider>
            <ConditionalChrome nav={<NavBar />} footer={<Footer />}>
              {children}
            </ConditionalChrome>
            <CartDrawer />
            <Suspense fallback={null}>
              <AuthModal />
            </Suspense>
          </SmoothScrollProvider>
        </Providers>
      </body>
    </html>
  );
}
