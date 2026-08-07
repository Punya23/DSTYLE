"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Section";
import { SectionHeader } from "./SectionHeader";
import type { Product } from "@/types";

export interface ProductRailProps {
  products: Product[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Renders the header's "shop all" link. Omit to render no link. */
  href?: string;
  linkLabel?: string;
  /** Eager-load the first few cards — set only on the first rail above the fold. */
  priority?: boolean;
  /** Extra classes on the <section> (background, rhythm overrides). */
  className?: string;
}

/**
 * Horizontally scrolling product rail — the workhorse of the commerce surfaces.
 * The strip bleeds to the viewport edge so the next card always peeks; that peek,
 * not a scrollbar, is what signals scrollability. Arrows are a desktop
 * convenience only, so they stay out of the accessibility tree — the strip is
 * natively scrollable and tabbable.
 */
export function ProductRail({
  products,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel,
  priority = false,
  className,
}: ProductRailProps) {
  const stripRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < max - 1);
  }, []);

  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // ResizeObserver delivers an initial measurement asynchronously once
    // observation starts, so the arrows self-calibrate without a synchronous
    // setState in this effect body. Resizes then keep them honest.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const nudge = useCallback((direction: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    // Distance between two card origins = card width + gap, whatever the breakpoint.
    const first = el.children.item(0);
    const second = el.children.item(1);
    const step = first
      ? second
        ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
        : first.getBoundingClientRect().width
      : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  const arrowClass =
    "grid h-11 w-11 place-items-center border border-brand-line text-brand-ink transition-colors duration-300 hover:border-brand-ink disabled:opacity-30 disabled:hover:border-brand-line";

  return (
    <section className={cn("section-rhythm", className)}>
      <Reveal className="shell">
        <div className="flex items-end justify-between gap-8">
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            href={href}
            linkLabel={linkLabel}
            className="min-w-0 flex-1"
          />
          <div aria-hidden className="hidden shrink-0 gap-2 md:flex">
            <button
              type="button"
              tabIndex={-1}
              disabled={!canPrev}
              onClick={() => nudge(-1)}
              className={arrowClass}
            >
              <ChevronLeft size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={!canNext}
              onClick={() => nudge(1)}
              className={arrowClass}
            >
              <ChevronRight size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        {/* `.shell` on the scroll container itself: the gutter becomes scroll
            padding, so the first card lines up with the header while the strip
            still runs to the viewport edge. */}
        <ul
          ref={stripRef}
          tabIndex={0}
          aria-label={title}
          onScroll={sync}
          className="shell mt-7 flex snap-x snap-mandatory gap-x-3 overflow-x-auto overscroll-x-contain py-2 hide-scrollbar sm:gap-x-4 [scroll-padding-inline:clamp(1.25rem,5vw,5rem)] [-webkit-overflow-scrolling:touch] focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-ink"
        >
          {products.map((product, i) => (
            <li
              key={product.id}
              className="w-[62vw] max-w-[340px] shrink-0 snap-start sm:w-[38vw] lg:w-[25vw]"
            >
              <ProductCard product={product} priority={priority && i < 4} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
