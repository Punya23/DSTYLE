import Image from "next/image";
import Link from "next/link";
import { COLLECTION_BANNERS } from "@/data/demo-assets";
import { cn } from "@/lib/utils";

/**
 * Collection banner for the PLP — a Server Component so the banner is real HTML
 * in the first byte and can carry the LCP image.
 *
 * Image resolution is deliberately three-tier and fail-safe:
 *   1. the collection's own `bannerImage` (admin-managed),
 *   2. the bundled `COLLECTION_BANNERS` fallback for that slug,
 *   3. no image at all — a plain ivory band.
 * A missing or non-whitelisted URL degrades to (3) rather than rendering a
 * broken <Image>, which `next/image` would otherwise throw on at request time.
 */

/** Must stay in sync with `images.remotePatterns` in next.config.ts. */
const ALLOWED_IMAGE_HOSTS = new Set(["res.cloudinary.com", "lh3.googleusercontent.com"]);

function safeImageSrc(url: string | null | undefined): string | null {
  const src = (url ?? "").trim();
  if (!src) return null;
  if (src.startsWith("/")) return src;
  try {
    const parsed = new URL(src);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.hostname)
      ? src
      : null;
  } catch {
    return null;
  }
}

export interface Crumb {
  label: string;
  /** Omit on the current page — it renders as plain text with aria-current. */
  href?: string;
}

interface CollectionHeroProps {
  title: string;
  description?: string | null;
  bannerImage?: string | null;
  /** Used for the `COLLECTION_BANNERS` fallback lookup. */
  slug?: string | null;
  crumbs: Crumb[];
  eyebrow?: string;
}

export function CollectionHero({
  title,
  description,
  bannerImage,
  slug,
  crumbs,
  eyebrow,
}: CollectionHeroProps) {
  const src =
    safeImageSrc(bannerImage) ?? (slug ? safeImageSrc(COLLECTION_BANNERS[slug]) : null);
  const onImage = src !== null;

  return (
    <section className="relative w-full h-[clamp(200px,30vw,360px)] overflow-hidden bg-brand-ivory-deep">
      {onImage ? (
        <>
          <Image
            src={src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Soft ink scrim — enough contrast for the title, not so much that
              the banner reads as a dark block. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-brand-ink/75 via-brand-ink/30 to-brand-ink/10"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-brand-sand-light via-brand-ivory to-brand-ivory-deep"
        />
      )}

      <div className="relative flex h-full flex-col justify-end shell pb-5 sm:pb-7 lg:pb-9">
        <nav aria-label="Breadcrumb" className="mb-2.5">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-sans tracking-luxe uppercase">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.label} className="flex items-center gap-2">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={onImage ? "text-brand-white/45" : "text-brand-grey-dark/60"}
                    >
                      /
                    </span>
                  )}
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className={cn(
                        "transition-colors",
                        onImage
                          ? "text-brand-white/70 hover:text-brand-champagne"
                          : "text-brand-grey-dark hover:text-brand-gold"
                      )}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={onImage ? "text-brand-champagne" : "text-brand-gold"}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {eyebrow && (
          <p className={cn("eyebrow mb-1.5", onImage && "eyebrow-light")}>{eyebrow}</p>
        )}

        {/* Upright, never italic — italic is reserved for the hero and brand story. */}
        <h1
          className={cn(
            "display-2 not-italic text-balance",
            onImage ? "text-brand-white" : "text-brand-ink"
          )}
        >
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              "mt-2 max-w-[62ch] text-[12px] sm:text-[13px] font-sans leading-relaxed line-clamp-2 text-pretty",
              onImage ? "text-brand-white/80" : "text-brand-ink-soft"
            )}
          >
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
