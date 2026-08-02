import type { Metadata } from "next";
import { appUrl } from "@/lib/app-url";

/** Single source of truth for the brand's identity in metadata and JSON-LD. */
export const SITE = {
  name: "Dstyle",
  legalName: "Dstyle Couture",
  tagline: "Indian Couture",
  description:
    "Dstyle — Indian couture for the modern woman. Bridal, festive, and pret collections crafted with intention.",
  locale: "en_IN",
  twitter: "@dstyle",
  /** Used for Organization JSON-LD; drop any you don't actually run. */
  sameAs: ["https://www.instagram.com/dstyle", "https://www.facebook.com/dstyle"],
} as const;

/** Absolute URL for a site-relative path. Search engines want absolute. */
export function absoluteUrl(path = "/"): string {
  return appUrl(path.startsWith("/") ? path : `/${path}`);
}

/**
 * Trim a description to a length search results won't truncate mid-word.
 * Strips newlines too — descriptions come from admin-entered copy.
 */
export function metaDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface PageSeoInput {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/collections/bridal". Becomes the canonical. */
  path: string;
  images?: { url: string; alt?: string }[];
  /** OpenGraph type — "website" for pages, "article" for editorial. */
  type?: "website" | "article";
  /** Set on thin, private, or duplicate pages. */
  noIndex?: boolean;
}

/**
 * Build a complete Metadata object: canonical, OpenGraph and Twitter card all
 * derived from one description so the three can never drift apart.
 */
export function pageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  noIndex = false,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const description155 = metaDescription(description);
  // Fall back to the site-wide OG image when a page has no imagery of its own.
  const ogImages = images?.length ? images.map((i) => ({ url: i.url, alt: i.alt ?? title })) : undefined;

  return {
    title,
    description: description155,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title,
      description: description155,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: SITE.twitter,
      title,
      description: description155,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
