"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ProductCard } from "./ProductCard";
import type { Product, Collection } from "@/types";

gsap.registerPlugin(ScrollTrigger);

const PRICE_RANGES = [
  { label: "All Prices", value: "" },
  { label: "Under ₹10,000", value: "0-10000" },
  { label: "₹10,000 – ₹25,000", value: "10000-25000" },
  { label: "₹25,000 – ₹50,000", value: "25000-50000" },
  { label: "Above ₹50,000", value: "50000-999999" },
];

interface CollectionsPageClientProps {
  initialProducts: Product[];
  collections: Collection[];
  activeCollection: string;
}

export function CollectionsPageClient({
  initialProducts,
  collections,
  activeCollection,
}: CollectionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [priceRange, setPriceRange] = useState("");
  const [sort, setSort] = useState("newest");
  const gridRef = useRef<HTMLDivElement>(null);

  const filteredProducts = initialProducts
    .filter((p) => {
      if (!priceRange) return true;
      const [min, max] = priceRange.split("-").map(Number);
      return p.basePrice >= min && p.basePrice <= max;
    })
    .sort((a, b) => {
      if (sort === "price-asc") return a.basePrice - b.basePrice;
      if (sort === "price-desc") return b.basePrice - a.basePrice;
      return 0;
    });

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = Array.from(gridRef.current.children);
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power2.out" }
    );
  }, [filteredProducts.length, activeCollection]);

  const setCollection = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === "all") params.delete("collection");
    else params.set("collection", slug);
    router.push(`/collections?${params.toString()}`);
  };

  return (
    <>
      {/* Header + tabs + filters — one merged, borderless block */}
      <div className="shell pt-5 sm:pt-9 lg:pt-12">
        <p className="eyebrow mb-3">The House of Dstyle</p>
        <h1 className="display-2 text-brand-ink">Collections</h1>

        {/* Collection tabs */}
        <div className="mt-9 -mx-1 overflow-x-auto hide-scrollbar">
          <div className="flex gap-6 lg:gap-9 px-1 w-max">
            <button
              onClick={() => setCollection("all")}
              className={`text-[11px] font-sans font-medium tracking-luxe uppercase pb-1.5 border-b transition-colors duration-300 ${
                activeCollection === "all" || !activeCollection
                  ? "border-brand-gold text-brand-ink"
                  : "border-transparent text-brand-grey-dark hover:text-brand-gold"
              }`}
            >
              All
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setCollection(col.slug)}
                className={`text-[11px] font-sans font-medium tracking-luxe uppercase pb-1.5 border-b transition-colors duration-300 ${
                  activeCollection === col.slug
                    ? "border-brand-gold text-brand-ink"
                    : "border-transparent text-brand-grey-dark hover:text-brand-gold"
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        {/* Count + sort */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <p className="text-[11px] font-sans text-brand-grey-dark tracking-luxe uppercase shrink-0">
            {initialProducts.length} {initialProducts.length === 1 ? "Piece" : "Pieces"}
          </p>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              aria-label="Filter by price"
              className="max-w-[42vw] sm:max-w-none text-[11px] font-sans tracking-wide uppercase bg-transparent text-brand-ink hover:text-brand-gold focus:outline-none cursor-pointer transition-colors"
            >
              {PRICE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <span className="h-3 w-px bg-brand-ivory-deep shrink-0" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="text-[11px] font-sans tracking-wide uppercase bg-transparent text-brand-ink hover:text-brand-gold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="shell py-12">
        <div className="w-full">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-display italic text-3xl text-[#888888]">
                No pieces found
              </p>
              <p className="text-[12px] font-sans text-[#888888] mt-2">
                Try adjusting your filters or browse all collections.
              </p>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10"
            >
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i < 8}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
