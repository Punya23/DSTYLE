"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { isVideoUrl } from "@/lib/media";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuthModal } from "@/store/auth-modal";
import { useWishlist } from "@/hooks/useWishlist";
import { ViewTransition } from "@/lib/view-transition";
import { CometCard } from "@/components/ui/aceternity/comet-card";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Pick<
    Product,
    "id" | "name" | "slug" | "basePrice" | "images" | "tags" | "skus" | "collection"
  >;
  priority?: boolean;
  compact?: boolean;
  index?: number;
}

export function ProductCard({
  product,
  priority = false,
  compact = false,
  index = 0,
}: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const { data: session } = useSession();
  const openAuth = useAuthModal((s) => s.open);
  const { isWishlisted, toggle } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const secondaryImage = product.images.find((i) => i.url !== primaryImage?.url);
  const primaryIsVideo = primaryImage ? isVideoUrl(primaryImage.url) : false;

  const isNew = product.tags.includes("new");
  const isSoldOut = product.skus.every((s) => s.stock === 0);
  const isLowStock = !isSoldOut && product.skus.some((s) => s.stock > 0 && s.stock <= 5);
  const minPrice = Math.min(...product.skus.map((s) => s.price));

  return (
    <div
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CometCard rotateDepth={7} translateDepth={8}>
      <Link
        href={`/products/${product.slug}`}
        className={`block relative overflow-hidden bg-brand-ivory-deep rounded-[4px] ${
          compact ? "aspect-[4/5]" : "aspect-[3/4]"
        }`}
      >
        {primaryImage ? (
          primaryIsVideo ? (
            <video
              src={primaryImage.url}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          ) : (
            <ViewTransition name={`product-${product.id}`} share="morph">
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                fill
                className={`object-cover transition-all duration-[1200ms] ease-out ${
                  hovered && secondaryImage ? "opacity-0 scale-105" : "opacity-100 scale-100"
                }`}
                sizes={compact ? "(max-width: 768px) 33vw, 16vw" : "(max-width: 768px) 50vw, 25vw"}
                priority={priority}
              />
            </ViewTransition>
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-champagne/40 via-brand-ivory to-brand-sand/30 flex items-center justify-center">
            <span className="font-display text-5xl text-brand-gold/70 italic">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {secondaryImage && !primaryIsVideo && (
          <Image
            src={secondaryImage.url}
            alt={secondaryImage.altText ?? product.name}
            fill
            className={`object-cover transition-all duration-[1200ms] ease-out absolute inset-0 ${
              hovered ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            sizes={compact ? "(max-width: 768px) 33vw, 16vw" : "(max-width: 768px) 50vw, 25vw"}
          />
        )}

        {/* Subtle hover scrim for badge/label legibility */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/10 to-transparent transition-opacity duration-500 pointer-events-none ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className={`absolute top-3 left-3 flex flex-col gap-1.5 ${compact ? "scale-90 origin-top-left" : ""}`}>
          {isNew && <Badge variant="default">New</Badge>}
          {isSoldOut && <Badge variant="red">Sold Out</Badge>}
          {isLowStock && <Badge variant="sand">Low Stock</Badge>}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            if (!session?.user) {
              openAuth();
              return;
            }
            toggle(product.id);
          }}
          className={`absolute top-3 right-3 grid place-items-center h-8 w-8 rounded-full bg-white/85 backdrop-blur-sm transition-all duration-300 ${
            hovered || wishlisted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={compact ? 13 : 15}
            className={wishlisted ? "fill-brand-wine stroke-brand-wine" : "stroke-black"}
          />
        </button>

        {!compact && (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-3.5 text-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              hovered ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <span className="text-[10px] font-sans font-semibold tracking-luxe uppercase text-black">
              Quick View
            </span>
          </div>
        )}
      </Link>
      </CometCard>

      <div className={compact ? "mt-3 space-y-1" : "mt-4 space-y-1.5"}>
        {product.collection && (
          <p className={`font-sans text-brand-gold tracking-luxe uppercase ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {product.collection.name}
          </p>
        )}
        <Link href={`/products/${product.slug}`} className="inline-block link-reveal">
          <h3
            className={`font-sans font-medium text-black leading-snug transition-colors ${
              compact ? "text-[12px] line-clamp-1" : "text-[13.5px]"
            }`}
          >
            {product.name}
          </h3>
        </Link>
        <p className={`font-sans text-[#555] ${compact ? "text-[11px]" : "text-[13px]"}`}>
          {formatPrice(minPrice)}
        </p>
      </div>
    </div>
  );
}
