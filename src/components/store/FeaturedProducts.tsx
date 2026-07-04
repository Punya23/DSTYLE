import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { Reveal, SectionHeading } from "./Section";
import type { Product } from "@/types";

interface FeaturedProductsProps {
  products: Product[];
  compact?: boolean;
}

export function FeaturedProducts({ products, compact = false }: FeaturedProductsProps) {
  if (products.length === 0) return null;
  const items = products.slice(0, 8);

  return (
    <section className="section-y bg-brand-ivory">
      <div className="shell">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10 lg:mb-14">
          <SectionHeading eyebrow="Curated for you" title="The Edit" />
          <Reveal delay={0.1}>
            <Link
              href="/collections"
              className="link-reveal text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink whitespace-nowrap"
            >
              View All
            </Link>
          </Reveal>
        </div>

        {/* Mobile: a swipeable snap-rail with the next card peeking.
            Desktop (md+): the standard editorial grid. */}
        <Reveal>
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-4 lg:gap-x-6 gap-y-9 lg:gap-y-14 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none -mx-6 px-6 md:mx-0 md:px-0 pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((product, i) => (
              <div
                key={product.id}
                className="w-[72%] shrink-0 snap-start md:w-auto md:shrink"
              >
                <ProductCard product={product} priority={i < 4} compact={compact} index={i} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
