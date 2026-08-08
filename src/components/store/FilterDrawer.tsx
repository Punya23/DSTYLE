"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/* ------------------------------------------------------------------ */
/* Media-query hooks                                                    */
/* ------------------------------------------------------------------ */
/* Subscribe/snapshot pairs must be module-level constants: passing a new
   function identity to useSyncExternalStore on every render re-subscribes
   on every commit. The server snapshot is deliberately `false` for both, so
   SSR emits the mobile, full-motion markup and the client corrects itself
   after hydration — the drawer is closed at that point, so nothing visibly
   flips. */
function subscribeTo(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const WIDE = "(min-width: 640px)";
const subscribeReduced = subscribeTo(REDUCED_MOTION);
const subscribeWide = subscribeTo(WIDE);
const getReduced = () => window.matchMedia(REDUCED_MOTION).matches;
const getWide = () => window.matchMedia(WIDE).matches;
const serverFalse = () => false;

/** `true` when the visitor has asked the OS to cut animation. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, getReduced, serverFalse);
}

/** `true` at the `sm` breakpoint and up — decides sheet-vs-side-drawer motion. */
function useWideViewport(): boolean {
  return useSyncExternalStore(subscribeWide, getWide, serverFalse);
}

/* ------------------------------------------------------------------ */
/* Filter model                                                         */
/* ------------------------------------------------------------------ */

/** Price bands, unchanged from the original inline select. */
export const PRICE_RANGES = [
  { label: "All Prices", value: "" },
  { label: "Under ₹10,000", value: "0-10000" },
  { label: "₹10,000 – ₹25,000", value: "10000-25000" },
  { label: "₹25,000 – ₹50,000", value: "25000-50000" },
  { label: "Above ₹50,000", value: "50000-999999" },
] as const;

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name: A–Z", value: "name-asc" },
] as const;

export const DEFAULT_SORT = "newest";

export interface FilterState {
  /** OR within the group, AND across groups — the standard facet contract. */
  sizes: string[];
  colors: string[];
  fabrics: string[];
  /** One of `PRICE_RANGES.value`; "" means no price filter. */
  price: string;
  inStock: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  sizes: [],
  colors: [],
  fabrics: [],
  price: "",
  inStock: false,
};

/* ------------------------------------------------------------------ */
/* Value extraction — every facet is derived from real product data     */
/* ------------------------------------------------------------------ */

const clean = (v: string | null | undefined): string | null => {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : null;
};

/** A SKU counts as sellable when it has stock and hasn't been killed manually. */
const sellable = (stock: number, isActive?: boolean) => stock > 0 && isActive !== false;

function sizesOf(p: Product): string[] {
  const out = new Set<string>();
  for (const s of p.skus) {
    const v = clean(s.size);
    if (v) out.add(v);
  }
  return [...out];
}

function inStockSizesOf(p: Product): string[] {
  const out = new Set<string>();
  for (const s of p.skus) {
    const v = clean(s.size);
    if (v && sellable(s.stock, s.isActive)) out.add(v);
  }
  return [...out];
}

function colorsOf(p: Product): string[] {
  const out = new Set<string>();
  for (const s of p.skus) {
    const v = clean(s.color);
    if (v) out.add(v);
  }
  return [...out];
}

/** Fabric and material are two columns describing one shopper-facing facet. */
function fabricsOf(p: Product): string[] {
  const out = new Set<string>();
  for (const v of [clean(p.fabric), clean(p.material)]) {
    if (v) out.add(v);
  }
  return [...out];
}

function hasStock(p: Product): boolean {
  return p.skus.some((s) => sellable(s.stock, s.isActive));
}

function inPriceBand(p: Product, band: string): boolean {
  if (!band) return true;
  const [min, max] = band.split("-").map(Number);
  if (Number.isNaN(min) || Number.isNaN(max)) return true;
  return p.basePrice >= min && p.basePrice <= max;
}

type FacetKey = "sizes" | "colors" | "fabrics" | "price" | "inStock";

/**
 * Does `p` satisfy the filter set, optionally ignoring one group?
 *
 * Ignoring a group is what makes the per-option counts honest: the count next
 * to "Size M" is how many pieces you'd get if you picked M *given everything
 * else you've already chosen*, which is not the same as the current result set.
 */
function matches(p: Product, f: FilterState, except?: FacetKey): boolean {
  if (except !== "price" && !inPriceBand(p, f.price)) return false;
  if (except !== "inStock" && f.inStock && !hasStock(p)) return false;
  if (except !== "sizes" && f.sizes.length > 0) {
    const have = new Set(sizesOf(p));
    if (!f.sizes.some((s) => have.has(s))) return false;
  }
  if (except !== "colors" && f.colors.length > 0) {
    const have = new Set(colorsOf(p));
    if (!f.colors.some((c) => have.has(c))) return false;
  }
  if (except !== "fabrics" && f.fabrics.length > 0) {
    const have = new Set(fabricsOf(p));
    if (!f.fabrics.some((m) => have.has(m))) return false;
  }
  return true;
}

/** The filtered list. Pure — call it during render, never from an effect. */
export function applyFilters(products: Product[], f: FilterState): Product[] {
  return products.filter((p) => matches(p, f));
}

/** Sort a copy; the server already returns newest-first, so that's the no-op. */
export function sortProducts(products: Product[], sort: string): Product[] {
  const out = [...products];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.basePrice - b.basePrice);
    case "price-desc":
      return out.sort((a, b) => b.basePrice - a.basePrice);
    case "name-asc":
      return out.sort((a, b) => a.name.localeCompare(b.name, "en"));
    default:
      return out;
  }
}

export function activeFilterCount(f: FilterState): number {
  return (
    f.sizes.length +
    f.colors.length +
    f.fabrics.length +
    (f.price ? 1 : 0) +
    (f.inStock ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ */
/* URL <-> filter serialisation                                         */
/* ------------------------------------------------------------------ */

const splitList = (raw: string | null): string[] =>
  (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export function filtersFromQuery(query: string): FilterState {
  const p = new URLSearchParams(query);
  const price = p.get("price") ?? "";
  return {
    sizes: splitList(p.get("size")),
    colors: splitList(p.get("color")),
    fabrics: splitList(p.get("fabric")),
    // Reject anything that isn't one of our bands so a hand-edited URL can't
    // produce a filter the UI has no way to clear.
    price: PRICE_RANGES.some((r) => r.value !== "" && r.value === price) ? price : "",
    inStock: p.get("stock") === "1",
  };
}

export function sortFromQuery(query: string): string {
  const raw = new URLSearchParams(query).get("sort") ?? "";
  return SORT_OPTIONS.some((o) => o.value === raw) ? raw : DEFAULT_SORT;
}

/**
 * Merge the filter state into an existing query string, preserving anything we
 * don't own (`tags`, campaign params). Empty values are deleted rather than
 * written as `key=`, so a cleared view has a clean, canonical URL.
 */
export function queryFromFilters(query: string, f: FilterState, sort: string): string {
  const p = new URLSearchParams(query);
  const set = (key: string, value: string) => {
    if (value) p.set(key, value);
    else p.delete(key);
  };
  set("size", f.sizes.join(","));
  set("color", f.colors.join(","));
  set("fabric", f.fabrics.join(","));
  set("price", f.price);
  set("stock", f.inStock ? "1" : "");
  set("sort", sort === DEFAULT_SORT ? "" : sort);
  return p.toString();
}

/* ------------------------------------------------------------------ */
/* Chips                                                                */
/* ------------------------------------------------------------------ */

export interface FilterChip {
  key: string;
  label: string;
  /** The filter state with this one value removed. */
  next: FilterState;
}

export function filterChips(f: FilterState): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const s of f.sizes) {
    chips.push({
      key: `size:${s}`,
      label: `Size ${s}`,
      next: { ...f, sizes: f.sizes.filter((v) => v !== s) },
    });
  }
  for (const c of f.colors) {
    chips.push({
      key: `color:${c}`,
      label: c,
      next: { ...f, colors: f.colors.filter((v) => v !== c) },
    });
  }
  for (const m of f.fabrics) {
    chips.push({
      key: `fabric:${m}`,
      label: m,
      next: { ...f, fabrics: f.fabrics.filter((v) => v !== m) },
    });
  }
  if (f.price) {
    chips.push({
      key: `price:${f.price}`,
      label: PRICE_RANGES.find((r) => r.value === f.price)?.label ?? f.price,
      next: { ...f, price: "" },
    });
  }
  if (f.inStock) {
    chips.push({ key: "stock", label: "In Stock", next: { ...f, inStock: false } });
  }
  return chips;
}

/* ------------------------------------------------------------------ */
/* Facet computation                                                    */
/* ------------------------------------------------------------------ */

export interface FacetOption {
  value: string;
  label: string;
  /** Pieces you'd see if this option were selected, honouring other groups. */
  count: number;
  disabled: boolean;
}

interface Facets {
  sizes: FacetOption[];
  colors: FacetOption[];
  fabrics: FacetOption[];
  price: FacetOption[];
  inStockCount: number;
}

const SIZE_ORDER = [
  "XXS", "XS", "S", "SMALL", "M", "MEDIUM", "L", "LARGE",
  "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "FREE", "FREE SIZE", "ONE SIZE",
];

function compareSizes(a: string, b: string): number {
  const ra = SIZE_ORDER.indexOf(a.toUpperCase());
  const rb = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ra !== -1 || rb !== -1) return (ra === -1 ? 999 : ra) - (rb === -1 ? 999 : rb);
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, "en");
}

/** Union of a facet's values across the whole set in view, with live counts. */
function optionsFor(
  products: Product[],
  f: FilterState,
  key: Extract<FacetKey, "sizes" | "colors" | "fabrics">,
  valuesOf: (p: Product) => string[],
  compare: (a: string, b: string) => number
): FacetOption[] {
  const universe = new Set<string>();
  for (const p of products) for (const v of valuesOf(p)) universe.add(v);

  const candidates = products.filter((p) => matches(p, f, key));
  const counts = new Map<string, number>();
  for (const p of candidates) {
    for (const v of new Set(valuesOf(p))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  return [...universe].sort(compare).map((value) => ({
    value,
    label: value,
    count: counts.get(value) ?? 0,
    disabled: (counts.get(value) ?? 0) === 0,
  }));
}

export function computeFacets(products: Product[], f: FilterState): Facets {
  const sizes = optionsFor(products, f, "sizes", sizesOf, compareSizes);

  // A size is offered only while some candidate actually has it in stock —
  // otherwise picking it lands the shopper on a wall of sold-out pieces.
  const sizeCandidates = products.filter((p) => matches(p, f, "sizes"));
  const stockedSizes = new Set<string>();
  for (const p of sizeCandidates) for (const v of inStockSizesOf(p)) stockedSizes.add(v);
  for (const opt of sizes) {
    if (!stockedSizes.has(opt.value)) opt.disabled = true;
  }

  const priceCandidates = products.filter((p) => matches(p, f, "price"));
  const price = PRICE_RANGES.filter((r) => r.value !== "").map((r) => {
    const count = priceCandidates.filter((p) => inPriceBand(p, r.value)).length;
    return { value: r.value, label: r.label, count, disabled: count === 0 };
  });

  const stockCandidates = products.filter((p) => matches(p, f, "inStock"));

  return {
    sizes,
    colors: optionsFor(products, f, "colors", colorsOf, (a, b) => a.localeCompare(b, "en")),
    fabrics: optionsFor(products, f, "fabrics", fabricsOf, (a, b) => a.localeCompare(b, "en")),
    price,
    inStockCount: stockCandidates.filter(hasStock).length,
  };
}

/* ------------------------------------------------------------------ */
/* Presentational bits                                                  */
/* ------------------------------------------------------------------ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function FacetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6 first:pt-0 last:pb-0">
      <h3 className="eyebrow mb-3.5">{title}</h3>
      {children}
    </section>
  );
}

function ChipOption({
  option,
  selected,
  strike = false,
  onToggle,
}: {
  option: FacetOption;
  selected: boolean;
  strike?: boolean;
  onToggle: () => void;
}) {
  const blocked = option.disabled && !selected;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={blocked}
      aria-pressed={selected}
      className={cn(
        // 44px minimum touch target, per the mobile-first brief.
        "inline-flex min-h-11 items-center gap-2 border px-3.5 text-[11px] font-sans font-medium tracking-luxe uppercase transition-colors duration-200",
        selected
          ? "border-brand-ink bg-brand-ink text-brand-white"
          : "border-brand-line bg-brand-white text-brand-ink hover:border-brand-gold",
        blocked && "cursor-not-allowed opacity-35",
        blocked && strike && "line-through"
      )}
    >
      <span className="max-w-[9rem] truncate">{option.label}</span>
      <span
        className={cn(
          "text-[10px] tracking-normal tabular-nums",
          selected ? "text-brand-champagne" : "text-brand-grey-dark"
        )}
      >
        {option.count}
      </span>
    </button>
  );
}

/**
 * A full-width facet row. `shape` is not decoration: a square marker signals a
 * multi-select group, a round one signals "pick at most one" — the same
 * checkbox-vs-radio contract shoppers already know.
 *
 * The label wraps rather than truncates, so a long free-text material value
 * ("Silk organza with zardozi, sequin and thread embroidery") is still legible.
 */
function RowOption({
  label,
  count,
  selected,
  disabled = false,
  shape = "check",
  onSelect,
}: {
  label: string;
  count?: number;
  selected: boolean;
  disabled?: boolean;
  shape?: "check" | "radio";
  onSelect: () => void;
}) {
  const blocked = disabled && !selected;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={blocked}
      aria-pressed={selected}
      className={cn(
        "flex w-full min-h-11 items-center justify-between gap-3 py-1.5 text-left transition-opacity",
        blocked && "cursor-not-allowed opacity-35"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-[18px] w-[18px] shrink-0 place-items-center border transition-colors",
            shape === "radio" && "rounded-full",
            selected ? "border-brand-ink bg-brand-ink" : "border-brand-line bg-brand-white"
          )}
        >
          {selected &&
            (shape === "radio" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-brand-white" />
            ) : (
              <Check size={11} strokeWidth={3} className="text-brand-white" />
            ))}
        </span>
        <span className="min-w-0 break-words text-[12.5px] font-sans leading-snug text-brand-ink">
          {label}
        </span>
      </span>
      {typeof count === "number" && (
        <span className="shrink-0 text-[11px] font-sans tabular-nums text-brand-grey-dark">
          {count}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                               */
/* ------------------------------------------------------------------ */

interface FilterDrawerProps {
  open: boolean;
  /** Must be referentially stable — it is a dependency of the trap effect. */
  onClose: () => void;
  /** The unfiltered set in view; every facet is computed from exactly this. */
  products: Product[];
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  sort: string;
  onSortChange: (next: string) => void;
  /** Live count with the current filters applied. */
  resultCount: number;
}

export function FilterDrawer({
  open,
  onClose,
  products,
  filters,
  onChange,
  onClear,
  sort,
  onSortChange,
  resultCount,
}: FilterDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const wide = useWideViewport();

  const facets = useMemo(() => computeFacets(products, filters), [products, filters]);
  const activeCount = activeFilterCount(filters);

  // Scroll lock + focus trap + focus restore, all torn down together so the
  // page can never be left with a locked <body> or stranded focus.
  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-drawer-autofocus]")?.focus();
    }, 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outside = !active || !panel.contains(active);

      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo?.focus?.();
    };
  }, [open, onClose]);

  const toggle = (key: "sizes" | "colors" | "fabrics", value: string) => {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  };

  const duration = reduced ? 0 : 0.36;
  // Bottom sheet on phones, right-hand slide-over from `sm` up.
  const closedOffset = wide ? { x: "100%" } : { y: "100%" };
  const openOffset = wide ? { x: 0 } : { y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort"
            initial={closedOffset}
            animate={openOffset}
            exit={closedOffset}
            transition={{ duration, ease: [0.25, 1, 0.5, 1] }}
            className={cn(
              "fixed z-[60] flex flex-col bg-brand-ivory",
              // Mobile: full-screen sheet. 100dvh, not 100vh, so the browser
              // chrome collapsing can't push the footer off-screen.
              "inset-x-0 bottom-0 h-[100dvh]",
              "sm:inset-y-0 sm:left-auto sm:right-0 sm:h-[100dvh] sm:w-[420px] sm:max-w-[92vw]"
            )}
          >
            {/* Header */}
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-brand-line px-5 sm:px-6">
              <h2 className="text-[11px] font-sans font-semibold uppercase tracking-luxe text-brand-ink">
                Filter &amp; Sort
                {activeCount > 0 && (
                  <span className="ml-2 text-brand-gold">({activeCount})</span>
                )}
              </h2>
              <button
                type="button"
                onClick={onClose}
                data-drawer-autofocus
                aria-label="Close filters"
                className="-mr-2 grid h-11 w-11 place-items-center text-brand-ink transition-colors hover:text-brand-gold"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Facets — `data-lenis-prevent` keeps the site's smooth-scroll
                instance from stealing this panel's scroll on touch. */}
            <div
              data-lenis-prevent
              className="flex-1 divide-y divide-brand-line overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
            >
              <FacetSection title="Sort By">
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => (
                    <RowOption
                      key={option.value}
                      label={option.label}
                      shape="radio"
                      selected={sort === option.value}
                      onSelect={() => onSortChange(option.value)}
                    />
                  ))}
                </div>
              </FacetSection>

              <FacetSection title="Availability">
                <RowOption
                  label="In stock only"
                  count={facets.inStockCount}
                  selected={filters.inStock}
                  disabled={facets.inStockCount === 0}
                  onSelect={() => onChange({ ...filters, inStock: !filters.inStock })}
                />
              </FacetSection>

              <FacetSection title="Price">
                <div className="space-y-1">
                  {facets.price.map((band) => (
                    <RowOption
                      key={band.value}
                      label={band.label}
                      count={band.count}
                      shape="radio"
                      selected={filters.price === band.value}
                      disabled={band.disabled}
                      onSelect={() =>
                        onChange({
                          ...filters,
                          price: filters.price === band.value ? "" : band.value,
                        })
                      }
                    />
                  ))}
                </div>
              </FacetSection>

              {facets.sizes.length > 0 && (
                <FacetSection title="Size">
                  <div className="flex flex-wrap gap-2">
                    {facets.sizes.map((option) => (
                      <ChipOption
                        key={option.value}
                        option={option}
                        strike
                        selected={filters.sizes.includes(option.value)}
                        onToggle={() => toggle("sizes", option.value)}
                      />
                    ))}
                  </div>
                </FacetSection>
              )}

              {facets.colors.length > 0 && (
                <FacetSection title="Colour">
                  <div className="flex flex-wrap gap-2">
                    {facets.colors.map((option) => (
                      <ChipOption
                        key={option.value}
                        option={option}
                        selected={filters.colors.includes(option.value)}
                        onToggle={() => toggle("colors", option.value)}
                      />
                    ))}
                  </div>
                </FacetSection>
              )}

              {facets.fabrics.length > 0 && (
                <FacetSection title="Fabric & Material">
                  {/* Rows, not chips: `material` in this catalogue holds
                      full descriptive phrases as often as single fabric
                      names, and a phrase truncated into a chip is unreadable. */}
                  <div className="space-y-0.5">
                    {facets.fabrics.map((option) => (
                      <RowOption
                        key={option.value}
                        label={option.label}
                        count={option.count}
                        selected={filters.fabrics.includes(option.value)}
                        disabled={option.disabled}
                        onSelect={() => toggle("fabrics", option.value)}
                      />
                    ))}
                  </div>
                </FacetSection>
              )}
            </div>

            {/* Footer — sits above the iOS home indicator. */}
            <div className="shrink-0 border-t border-brand-line bg-brand-white px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClear}
                  disabled={activeCount === 0}
                  className="btn-secondary flex-1 px-4"
                >
                  Clear All
                </button>
                <button type="button" onClick={onClose} className="btn-primary flex-[1.4] px-4">
                  View {resultCount} {resultCount === 1 ? "Piece" : "Pieces"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
