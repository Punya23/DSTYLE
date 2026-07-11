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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Dstyle — Indian Couture",
    template: "%s | Dstyle",
  },
  description:
    "Dstyle — Indian couture for the modern woman. Bridal, festive, and pret collections crafted with intention.",
  keywords: ["Indian fashion", "designer wear", "bridal", "couture", "lehenga", "saree", "Dstyle"],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Dstyle",
    title: "Dstyle — Indian Couture",
    description:
      "Hand-embroidered bridal, festive, cocktail and pret couture — crafted in our Mumbai atelier.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dstyle — Indian Couture",
    description:
      "Hand-embroidered bridal, festive, cocktail and pret couture — crafted in our Mumbai atelier.",
  },
  alternates: { canonical: "/" },
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
