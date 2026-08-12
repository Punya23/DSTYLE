"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { isVideoUrl, videoUrl, videoPosterUrl } from "@/lib/media";
import { cn, formatPrice } from "@/lib/utils";
import { discountPercent } from "@/lib/pricing";
import { useAuthModal } from "@/store/auth-modal";
import { useWishlist } from "@/hooks/useWishlist";
import { ViewTransition } from "@/lib/view-transition";
import type { ProductCardData } from "@/lib/product-select";

interface ProductCardProps {
  /** Exactly the columns `productCardSelect` returns — see `@/lib/product-select`. */
  product: ProductCardData;
  /**
   * Above-the-fold card. Loads eagerly at high fetch priority instead of
   * lazily. Deliberately *not* wired to `<Image preload>`: a grid has several
   * LCP candidates depending on viewport, and Next 16 warns against preloading
   * in that case (it would inject one `<link rel=preload>` per card).
   */
  priority?: boolean;
  /** Denser variant for rails, the wishlist and account grids. */
  compact?: boolean;
}

/**
 * Widths the card actually renders at across every grid that mounts it
 * (collections 2-col / 4-col, the featured + rail carousels, account grids).
 * Rounded up to the widest of the overlapping layouts so no breakpoint ever
 * gets served an image narrower than its box.
 */
const SIZES_DEFAULT = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 72vw";
const SIZES_COMPACT = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 60vw";

/**
 * Units left across every size before the card calls a piece scarce.
 *
 * Card-level scarcity is about the *piece* being almost gone, not one size.
 * The old test — "any size at five or fewer" — is true of essentially every
 * product in a couture catalogue, where a size rarely runs past three units,
 * so the chip rendered on all of them at once and stopped carrying any
 * information. Per-size warnings still belong on the PDP, where the shopper is
 * choosing a size (see `toAvailability` in @/lib/inventory).
 */
const LOW_STOCK_UNITS = 3;

type BadgeTone = "sale" | "solid" | "quiet" | "alert";

/** Square chips only — wine on a pale wash for sale, never a bright red pill. */
const BADGE_TONE: Record<BadgeTone, string> = {
  sale: "bg-brand-wine-wash text-brand-wine",
  solid: "bg-brand-ink text-brand-white",
  quiet: "bg-brand-white text-brand-ink",
  alert: "bg-brand-white text-brand-wine",
};

interface CardBadge {
  label: string;
  tone: BadgeTone;
}

export function ProductCard({
  product,
  priority = false,
  compact = false,
}: ProductCardProps) {
  const { data: session } = useSession();
  const openAuth = useAuthModal((s) => s.open);
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const primaryIsVideo = primaryImage ? isVideoUrl(primaryImage.url) : false;
  // A still cross-fades into another still; an autoplaying clip is the hover
  // treatment in its own right, so it never gets a second frame.
  const secondaryImage = primaryIsVideo
    ? undefined
    : product.images.find((i) => i.url !== primaryImage?.url && !isVideoUrl(i.url));

  // The card advertises the cheapest size. That size's own compare-at wins over
  // the product-level one so a per-size markdown is never overstated; the
  // product MRP is the fallback for catalogues that only price at the top level.
  const cheapestSku = product.skus.length
    ? product.skus.reduce((lo, s) => (s.price < lo.price ? s : lo))
    : null;
  const price = cheapestSku?.price ?? product.basePrice;
  const mrp = cheapestSku?.mrp ?? product.mrp ?? null;
  const discount = discountPercent(price, mrp);

  const isSoldOut = product.skus.length > 0 && product.skus.every((s) => s.stock === 0);
  const unitsLeft = product.skus.reduce((n, s) => n + Math.max(s.stock, 0), 0);
  const isLowStock = !isSoldOut && unitsLeft > 0 && unitsLeft <= LOW_STOCK_UNITS;

  // Listed in priority order, then capped at ONE. A card is a photograph, a
  // name and a price; a stack of chips over the artwork (NEW above LOW STOCK
  // above a discount, on every card in the rail) reads as noise, not urgency.
  // The order is what guarantees the chip that survives is the one that most
  // changes the decision.
  // Availability outranks price, because the price row below already carries
  // the markdown as a struck-through MRP — the chip would only be saying it
  // twice — while nothing else on the card says a piece is gone or nearly gone.
  const badge: CardBadge | undefined = [
    isSoldOut ? { label: "Sold out", tone: "solid" as const } : null,
    isLowStock ? { label: "Low stock", tone: "alert" as const } : null,
    discount !== null ? { label: `${discount}% off`, tone: "sale" as const } : null,
    product.tags.includes("new") ? { label: "New", tone: "quiet" as const } : null,
  ].find((b): b is CardBadge => b !== null);

  const sizes = compact ? SIZES_COMPACT : SIZES_DEFAULT;
  const href = `/products/${product.slug}`;

  return (
    <article className="group relative w-full">
      <Link
        href={href}
        className={cn(
          "relative block w-full overflow-hidden bg-brand-ivory-deep",
          compact ? "aspect-[4/5]" : "aspect-[3/4]"
        )}
      >
        {primaryImage ? (
          primaryIsVideo ? (
            <video
              src={videoUrl(primaryImage.url)}
              poster={videoPosterUrl(primaryImage.url)}
              autoPlay
              muted
              loop
              playsInline
              // A grid of autoplaying reels is the worst case for a mobile
              // connection. The poster paints immediately; the clip itself only
              // starts fetching once the browser decides the card is worth it.
              preload="none"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <>
              <ViewTransition name={`product-${product.id}`} share="morph">
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.altText ?? product.name}
                  fill
                  sizes={sizes}
                  loading={priority ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : undefined}
                  className={cn(
                    "object-cover object-center",
                    // Opacity only — nothing here can move the box, so the
                    // cross-fade is layout-shift free.
                    secondaryImage &&
                      "transition-opacity duration-500 ease-lux group-hover:opacity-0 motion-reduce:transition-none"
                  )}
                />
              </ViewTransition>

              {secondaryImage && (
                /*
                 * Desktop only, twice over: `hidden` until the pointer can
                 * actually hover (so phones never download a frame they can
                 * never see — lazy loading skips a display:none image), and
                 * Tailwind v4 already wraps `group-hover:` in
                 * `@media (hover: hover)`, so a tap can't latch the fade on.
                 */
                <Image
                  src={secondaryImage.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes={sizes}
                  loading="lazy"
                  className="hidden object-cover object-center opacity-0 transition-opacity duration-500 ease-lux group-hover:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:block"
                />
              )}
            </>
          )
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-champagne/40 via-brand-ivory to-brand-sand/30">
            <span className="font-display text-5xl not-italic text-brand-gold/70">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {badge && (
          <span
            className={cn(
              "pointer-events-none absolute top-3 left-3 inline-flex max-w-[72%] items-center rounded-none px-1.5 py-1 font-sans leading-none font-medium tracking-[0.14em] uppercase",
              "text-[10px] sm:text-[9px]",
              BADGE_TONE[badge.tone]
            )}
          >
            {badge.label}
          </span>
        )}
      </Link>

      {/*
       * Outside the <a> — a button nested in an anchor is invalid HTML and the
       * old `preventDefault()` dance only papered over it. 44x44 tap target
       * with the glyph optically centred in the corner.
       */}
      <button
        type="button"
        onClick={() => {
          if (!session?.user) {
            openAuth();
            return;
          }
          toggle(product.id);
        }}
        aria-pressed={wishlisted}
        aria-label={
          wishlisted
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        }
        className="absolute top-0 right-0 z-10 grid h-11 w-11 place-items-center bg-transparent"
      >
        <Heart
          size={compact ? 16 : 17}
          strokeWidth={1.4}
          aria-hidden
          className={cn(
            "transition-colors duration-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]",
            wishlisted
              ? "fill-brand-wine stroke-brand-wine"
              : "fill-transparent stroke-brand-ink/45 group-hover:stroke-brand-ink"
          )}
        />
      </button>

      <div className={compact ? "mt-3" : "mt-3 sm:mt-4"}>
        {product.collection && (
          <p className="eyebrow truncate">{product.collection.name}</p>
        )}

        <h3 className="mt-1.5">
          <Link
            href={href}
            className={cn(
              // `.product-title` is the site-wide upright sans treatment —
              // commerce type is never the display serif, never italic.
              "product-title block text-[13px] transition-colors duration-300 hover:text-brand-gold-deep sm:text-[14px]",
              compact ? "line-clamp-1" : "line-clamp-2"
            )}
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* Gated on `discount`, not on `mrp`, so a compare-at that doesn't
              actually beat the price never renders a pointless strikethrough. */}
          {discount !== null && mrp !== null && (
            <span className="price-was font-sans text-[12px]">{formatPrice(mrp)}</span>
          )}
          <span className="font-sans text-[13px] font-medium text-brand-ink tabular-nums sm:text-[14px]">
            {formatPrice(price)}
          </span>
        </div>
      </div>
    </article>
  );
}
