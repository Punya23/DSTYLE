"use client";

import { useId, useRef, useState } from "react";
import { SizeGuide } from "./SizeGuide";
import { cn, formatPrice } from "@/lib/utils";

/**
 * The PDP information set, as one tab group.
 *
 * Mobile is the accordion: each tab button sits directly above its own panel,
 * full width, one open at a time. From `md` up the same buttons collapse into a
 * horizontally scrollable strip with the panel underneath. That switch is pure
 * CSS — the tablist is `display: contents` on mobile so its buttons become
 * siblings of the panels and `order` interleaves them — so there is one DOM
 * tree, one set of ids, and no breakpoint flash on hydration.
 *
 * Every value rendered here is passed in from the product row, the live store
 * config or the review table. Nothing in this file invents a fact about the
 * garment, the delivery promise or the returns policy.
 */

export interface TabSpec {
  label: string;
  value: string;
}

export interface TabReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  /** Formatted on the server, so the client never re-localises a date. */
  date: string;
  author: string;
}

export interface TabSize {
  size: string;
  /** Derived from SKU.stock — never a stored flag. */
  inStock: boolean;
}

interface ProductTabsProps {
  /** Product.description */
  description: string;
  /** Garment attribute rows, already filtered to the ones that are filled in. */
  specs: TabSpec[];
  /** Product.fabric */
  fabric?: string | null;
  /** Product.material */
  material?: string | null;
  /** Product.careInstr */
  careInstr?: string | null;
  /** Product.length */
  lengthNote?: string | null;
  /** One entry per size the piece is cut in, from its SKU rows. */
  sizes: TabSize[];
  /** Product.deliveryTime — omitted entirely when the row has none. */
  deliveryTime?: string | null;
  /** StoreSetting.shippingFlat */
  shippingFlat: number;
  /** StoreSetting.freeShippingThreshold */
  freeShippingThreshold: number;
  /** StoreSetting.codFee */
  codFee: number;
  /** RETURN_WINDOW_DAYS — the window the returns endpoint actually enforces. */
  returnWindowDays: number;
  /** Aggregate over the Review table. Null when the piece has no reviews. */
  rating: { average: number; count: number } | null;
  /** The five most recent reviews. */
  reviews: TabReview[];
  className?: string;
}

/** Read-only five-star mark. Local so the PDP doesn't pull in the review form. */
function Stars({ value }: { value: number }) {
  return (
    <span
      role="img"
      aria-label={`${value} out of 5 stars`}
      className="inline-flex items-center gap-0.5 leading-none"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden
          className={cn("text-[13px] leading-none", star <= value ? "text-brand-gold" : "text-brand-grey-mid")}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function SpecList({ rows }: { rows: TabSpec[] }) {
  return (
    <dl className="grid grid-cols-[minmax(80px,auto)_1fr] gap-x-5 gap-y-3 sm:gap-x-8">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="font-sans text-[10px] font-medium tracking-[0.18em] uppercase text-brand-grey-dark pt-0.5">
            {row.label}
          </dt>
          <dd className="min-w-0 font-sans text-[13px] leading-[1.7] text-brand-ink-soft break-words">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface Tab {
  id: string;
  label: string;
  panel: React.ReactNode;
}

export function ProductTabs({
  description,
  specs,
  fabric,
  material,
  careInstr,
  lengthNote,
  sizes,
  deliveryTime,
  shippingFlat,
  freeShippingThreshold,
  codFee,
  returnWindowDays,
  rating,
  reviews,
  className,
}: ProductTabsProps) {
  const uid = useId();
  const [active, setActive] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs: Tab[] = [];

  tabs.push({
    id: "piece",
    label: "The Piece",
    panel: <p className="body-copy text-pretty">{description}</p>,
  });

  if (specs.length > 0) {
    tabs.push({ id: "details", label: "Details", panel: <SpecList rows={specs} /> });
  }

  // "Fabric & Care" only earns a tab when the garment record actually carries
  // cloth or care copy — an empty care panel would have to be written by us.
  const cloth = fabric?.trim() || null;
  const cloth2 = material?.trim() && material.trim() !== cloth ? material.trim() : null;
  const care = careInstr?.trim() || null;
  if (cloth || cloth2 || care) {
    const clothRows: TabSpec[] = [];
    if (cloth) clothRows.push({ label: "Fabric", value: cloth });
    if (cloth2) clothRows.push({ label: "Material", value: cloth2 });

    tabs.push({
      id: "fabric",
      label: "Fabric & Care",
      panel: (
        <div className="space-y-6">
          {clothRows.length > 0 && <SpecList rows={clothRows} />}
          {care && (
            <div>
              <h3 className="micro-label text-brand-ink">Care</h3>
              <p className="body-copy mt-3 text-pretty">{care}</p>
            </div>
          )}
        </div>
      ),
    });
  }

  if (sizes.length > 0) {
    tabs.push({
      id: "fit",
      label: "Size & Fit",
      panel: (
        <div className="space-y-6">
          <div>
            <h3 className="micro-label text-brand-ink">Cut in these sizes</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <li
                  key={s.size}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-2 border px-3 font-sans text-[12px]",
                    s.inStock
                      ? "border-brand-line text-brand-ink"
                      : "border-brand-line text-brand-grey-dark"
                  )}
                >
                  <span className={s.inStock ? undefined : "line-through"}>{s.size}</span>
                  {!s.inStock && (
                    <span className="text-[9px] tracking-[0.14em] uppercase">Sold out</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {lengthNote && <SpecList rows={[{ label: "Length", value: lengthNote }]} />}

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="micro-label inline-flex min-h-[44px] items-center border-b border-brand-line pb-1 text-brand-ink transition-colors duration-300 hover:border-brand-ink"
          >
            View the house size guide
          </button>
        </div>
      ),
    });
  }

  tabs.push({
    id: "shipping",
    label: "Shipping & Returns",
    panel: (
      <div className="space-y-3.5">
        {deliveryTime?.trim() && (
          <p className="body-copy">
            <span className="text-brand-ink">Dispatch — </span>
            {deliveryTime.trim()}
          </p>
        )}
        <p className="body-copy">
          <span className="text-brand-ink">Shipping — </span>
          {shippingFlat <= 0
            ? "complimentary on every order."
            : freeShippingThreshold <= 0
              ? `a flat ${formatPrice(shippingFlat)} per order.`
              : `a flat ${formatPrice(shippingFlat)}, and complimentary once your order passes ${formatPrice(
                  freeShippingThreshold
                )}.`}
        </p>
        <p className="body-copy">
          <span className="text-brand-ink">Cash on delivery — </span>
          {codFee > 0
            ? `available for an extra ${formatPrice(codFee)}.`
            : "available at no extra charge."}
        </p>
        <p className="body-copy">
          <span className="text-brand-ink">Returns — </span>
          {`you have ${returnWindowDays} days from delivery to raise a return from your account.`}
        </p>
      </div>
    ),
  });

  if (rating && reviews.length > 0) {
    tabs.push({
      id: "reviews",
      label: `Reviews (${rating.count})`,
      panel: (
        <div className="space-y-7">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <p className="font-display text-[1.75rem] leading-none text-brand-ink tabular-nums">
              {rating.average.toFixed(1)}
              <span className="font-sans text-[13px] text-brand-grey-dark"> / 5</span>
            </p>
            <Stars value={Math.round(rating.average)} />
            <p className="font-sans text-[12px] text-brand-grey-dark">
              {rating.count === 1 ? "1 review" : `${rating.count} reviews`}
            </p>
          </div>

          <ul className="divide-y divide-brand-line border-y border-brand-line">
            {reviews.map((review) => (
              <li key={review.id} className="py-5">
                <Stars value={review.rating} />
                {review.title && (
                  <p className="mt-2.5 font-sans text-[13px] font-medium text-brand-ink">
                    {review.title}
                  </p>
                )}
                <p className="body-copy mt-2 text-pretty">{review.body}</p>
                <p className="mt-3 font-sans text-[11px] text-brand-grey-dark">
                  {review.author} · {review.date}
                </p>
              </li>
            ))}
          </ul>

          <p className="font-sans text-[11px] leading-[1.7] text-brand-grey-dark">
            Reviews are written by customers once their order has been delivered.
          </p>
        </div>
      ),
    });
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    let next: number;

    switch (event.key) {
      // Both axes: the strip is a row on desktop and a stack on mobile, and
      // the same component serves both.
      case "ArrowRight":
      case "ArrowDown":
        next = active === last ? 0 : active + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = active === 0 ? last : active - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    // Roving tabindex: selection follows focus, so the panel and the focused
    // tab never disagree.
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const availableSizes = sizes.map((s) => s.size);

  return (
    <section className={cn("border-t border-brand-line", className)}>
      <div className="flex flex-col">
        <div
          role="tablist"
          aria-label="Product information"
          onKeyDown={onKeyDown}
          className="contents md:flex md:gap-2 md:overflow-x-auto md:overscroll-x-contain md:py-5 hide-scrollbar md:[-webkit-overflow-scrolling:touch]"
        >
          {tabs.map((tab, i) => {
            const selected = active === i;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${tab.id}`}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                aria-selected={selected}
                aria-controls={`${uid}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                style={{ order: i * 2 }}
                className={cn(
                  // Mobile: a full-width accordion row, 52px tall.
                  "flex w-full min-h-[52px] items-center justify-between gap-4 border-b border-brand-line py-4 text-left transition-colors duration-300",
                  // Desktop: the same button as a square chip in a scrolling strip.
                  "md:w-auto md:min-h-[44px] md:shrink-0 md:justify-center md:whitespace-nowrap md:border md:px-4 md:py-3",
                  selected
                    ? "text-brand-ink md:border-brand-ink md:bg-brand-ink md:text-brand-white"
                    : "text-brand-ink-soft hover:text-brand-ink md:border-brand-line md:hover:border-brand-ink"
                )}
              >
                <span className="micro-label">{tab.label}</span>
                <span
                  aria-hidden
                  className="text-lg leading-none text-brand-gold md:hidden"
                >
                  {selected ? "−" : "+"}
                </span>
              </button>
            );
          })}
        </div>

        {tabs.map((tab, i) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${uid}-panel-${tab.id}`}
            aria-labelledby={`${uid}-tab-${tab.id}`}
            tabIndex={0}
            hidden={active !== i}
            style={{ order: i * 2 + 1 }}
            className="min-w-0 pt-5 pb-7 md:pt-1 md:pb-10"
          >
            {tab.panel}
          </div>
        ))}
      </div>

      <SizeGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        availableSizes={availableSizes}
      />
    </section>
  );
}
