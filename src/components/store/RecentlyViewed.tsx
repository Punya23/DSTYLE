"use client";

import { useTrackProductView, useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { ProductCard } from "@/components/store/ProductCard";

/**
 * Records a product view. Renders nothing — mount it on a product page and it
 * quietly keeps the shopper's history up to date.
 */
export function TrackProductView({ productId }: { productId: string }) {
  useTrackProductView(productId);
  return null;
}

interface StripProps {
  /** Omit this product from the strip — usually the page you're already on. */
  excludeId?: string;
  limit?: number;
  title?: string;
  className?: string;
}

/**
 * Horizontal "recently viewed" rail. Renders nothing until there's something
 * worth showing, so it never leaves an empty heading on the page.
 */
export function RecentlyViewedStrip({
  excludeId,
  limit = 8,
  title = "Recently Viewed",
  className,
}: StripProps) {
  const { products } = useRecentlyViewed();
  const items = products.filter((p) => p.id !== excludeId).slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-8 flex items-end justify-between">
        <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
          {title}
        </h2>
        <span className="h-px w-16 gold-rule-solid opacity-60" />
      </div>

      <div className="-mx-6 flex gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0">
        {items.map((product, i) => (
          <div key={product.id} className="w-[190px] shrink-0 sm:w-[230px]">
            <ProductCard product={product} index={i} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
