"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  FilterDrawer,
  SORT_OPTIONS,
  activeFilterCount,
  applyFilters,
  filterChips,
  filtersFromQuery,
  queryFromFilters,
  sortFromQuery,
  sortProducts,
  useReducedMotion,
  type FilterState,
} from "./FilterDrawer";
import type { Product, Collection } from "@/types";

gsap.registerPlugin(ScrollTrigger);

/** How long to wait after the last facet tap before writing the URL. */
const URL_SYNC_DELAY = 220;

interface CollectionsPageClientProps {
  /** Everything the server fetched for this collection — filtering is client-side. */
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
  const pathname = usePathname();
  const reduced = useReducedMotion();

  // The URL seeds the filters exactly once, on mount, so a shared or reloaded
  // link opens pre-filtered. From then on React state is the source of truth
  // for rendering and the URL is written back to (debounced) — that keeps every
  // facet tap instant instead of waiting on an RSC round-trip.
  //
  // Seeded from `window.location.search` in an effect rather than from
  // `useSearchParams()` during render, and that distinction is load-bearing:
  // `useSearchParams` suspends while a route is being prerendered, so the
  // enclosing Suspense boundary rendered its `null` fallback into the static
  // HTML — every collection page shipped an EMPTY product grid, filled in only
  // after hydration. Search engines saw no products and the first paint had
  // nothing in it. Reading the query string after mount costs one extra render
  // for a visitor who arrived on a filtered link, and gets the whole catalogue
  // into the prerendered document for everyone else.
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mount only: after this the state, not the URL, is the source of truth. The
  // lint rule below guards against effects that derive state from render-time
  // values (props/state) — this derives it from `window.location`, which does
  // not exist during render, so there is nowhere else to read it without
  // breaking hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const query = window.location.search.replace(/^\?/, "");
    if (!query) return;
    setFilters(filtersFromQuery(query));
    setSort(sortFromQuery(query));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const gridRef = useRef<HTMLDivElement>(null);
  const syncTimer = useRef<number | null>(null);

  /* ---------------------------------------------------------------- */
  /* URL synchronisation                                               */
  /* ---------------------------------------------------------------- */

  const cancelSync = useCallback(() => {
    if (syncTimer.current !== null) {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
  }, []);

  const syncUrl = useCallback(
    (nextFilters: FilterState, nextSort: string) => {
      cancelSync();
      syncTimer.current = window.setTimeout(() => {
        syncTimer.current = null;
        // Read live so params we don't own (`tags`, campaign codes) survive.
        const query = queryFromFilters(window.location.search, nextFilters, nextSort);
        startTransition(() => {
          router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        });
      }, URL_SYNC_DELAY);
    },
    [cancelSync, pathname, router]
  );

  useEffect(() => cancelSync, [cancelSync]);

  const handleFilters = useCallback(
    (next: FilterState) => {
      setFilters(next);
      syncUrl(next, sort);
    },
    [sort, syncUrl]
  );

  const handleSort = useCallback(
    (next: string) => {
      setSort(next);
      syncUrl(filters, next);
    },
    [filters, syncUrl]
  );

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    syncUrl(EMPTY_FILTERS, sort);
  }, [sort, syncUrl]);

  // Each collection is its own indexable URL rather than a query-string facet,
  // so it can carry its own title, description and canonical. Facet selections
  // are dropped on the way — the next collection's facets are a different set.
  const setCollection = useCallback(
    (slug: string) => {
      cancelSync();
      const params = new URLSearchParams(window.location.search);
      for (const key of ["collection", "size", "color", "fabric", "price", "stock"]) {
        params.delete(key);
      }
      const query = params.toString();
      const base = slug === "all" ? "/collections" : `/collections/${slug}`;
      router.push(query ? `${base}?${query}` : base);
    },
    [cancelSync, router]
  );

  /* ---------------------------------------------------------------- */
  /* Derived state — computed during render, never in an effect        */
  /* ---------------------------------------------------------------- */

  const filtered = useMemo(
    () => sortProducts(applyFilters(initialProducts, filters), sort),
    [initialProducts, filters, sort]
  );
  const chips = useMemo(() => filterChips(filters), [filters]);
  const activeCount = activeFilterCount(filters);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  /* ---------------------------------------------------------------- */
  /* Grid reveal                                                       */
  /* ---------------------------------------------------------------- */

  // Keying on the id list (not just the length) means a filter swap that
  // happens to return the same number of pieces still re-runs the reveal.
  const revealKey = useMemo(() => filtered.map((p) => p.id).join(","), [filtered]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const cards = Array.from(grid.children);
    if (cards.length === 0) return;

    if (reduced) {
      gsap.set(cards, { clearProps: "all" });
      return;
    }

    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.045, ease: "power2.out", overwrite: "auto" }
    );
    return () => {
      tween.kill();
      // Never leave a card stuck at opacity 0 if the list changes mid-tween.
      gsap.set(cards, { clearProps: "all" });
    };
  }, [revealKey, reduced]);

  return (
    <>
      {/* Collection tabs — horizontally scrollable on mobile, never wrapping */}
      <div className="shell pt-4 sm:pt-6">
        <div className="-mx-1 overflow-x-auto hide-scrollbar">
          <div className="flex w-max gap-5 px-1 lg:gap-8">
            {[{ id: "all", slug: "all", name: "All" }, ...collections].map((tab) => {
              const isActive =
                tab.slug === activeCollection ||
                (tab.slug === "all" && (activeCollection === "all" || !activeCollection));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCollection(tab.slug)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    // min-w-11 alongside min-h-11: short labels like "All" and
                    // "Pret" are only ~26px wide on their text alone, which
                    // misses the 44px touch minimum on the horizontal axis.
                    "inline-flex min-h-11 min-w-11 shrink-0 items-end justify-center pb-2 border-b text-[11px] font-sans font-medium uppercase tracking-luxe transition-colors duration-300",
                    isActive
                      ? "border-brand-gold text-brand-ink"
                      : "border-transparent text-brand-grey-dark hover:text-brand-gold"
                  )}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control bar. Sticky beneath the fixed nav so "Filter & sort" is always
          a thumb away — a top-sticky bar can never cover the last row of the
          grid the way a bottom-docked one would. */}
      <div className="sticky top-[64px] sm:top-[76px] z-30 border-b border-brand-line bg-brand-ivory/95 backdrop-blur-sm">
        <div className="shell flex items-center justify-between gap-3 py-2.5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-brand-ink px-3 text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-brand-ink transition-colors duration-300 hover:bg-brand-ink hover:text-brand-white sm:px-4 sm:tracking-luxe"
          >
            <SlidersHorizontal size={14} strokeWidth={1.5} />
            <span>Filter &amp; Sort</span>
            {activeCount > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-gold px-1 text-[10px] font-semibold leading-none text-brand-white">
                {activeCount}
              </span>
            )}
          </button>

          <p
            aria-live="polite"
            className="min-w-0 truncate text-[11px] font-sans uppercase tracking-luxe text-brand-grey-dark"
          >
            {filtered.length} {filtered.length === 1 ? "Piece" : "Pieces"}
          </p>

          {/* Desktop convenience only — sort also lives inside the drawer, which
              is the sole control on phones. */}
          <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
            <label
              htmlFor="plp-sort"
              className="text-[10px] font-sans uppercase tracking-luxe text-brand-grey-dark"
            >
              Sort
            </label>
            <select
              id="plp-sort"
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
              className="cursor-pointer bg-transparent text-[11px] font-sans uppercase tracking-wide text-brand-ink transition-colors hover:text-brand-gold focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Applied filters — scrolls sideways instead of stacking into a tall
            block that would eat the viewport on a phone. */}
        {chips.length > 0 && (
          <div className="shell -mt-0.5 overflow-x-auto pb-2.5 hide-scrollbar">
            <div className="flex w-max items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleFilters(chip.next)}
                  title={chip.label}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 border border-brand-line bg-brand-white px-3 text-[10px] font-sans uppercase tracking-luxe text-brand-ink transition-colors hover:border-brand-gold"
                >
                  <span className="max-w-[11rem] truncate">{chip.label}</span>
                  <X size={11} strokeWidth={2} className="text-brand-grey-dark" />
                  <span className="sr-only">Remove filter {chip.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-9 shrink-0 items-center px-2 text-[10px] font-sans uppercase tracking-luxe text-brand-gold underline underline-offset-4 transition-colors hover:text-brand-ink"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="shell pt-6 pb-16 sm:pt-8 sm:pb-20 lg:pb-24">
        {filtered.length === 0 ? (
          <div className="py-20 text-center sm:py-28">
            <p className="font-display text-3xl text-brand-ink">No pieces match</p>
            <p className="body-copy mx-auto mt-2 max-w-[46ch]">
              {activeCount > 0
                ? "Nothing in this collection fits every filter you've applied. Try widening your selection."
                : "This collection is being restocked. Browse the other edits in the meantime."}
            </p>
            {activeCount > 0 ? (
              <button type="button" onClick={handleClear} className="btn-secondary mt-7">
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollection("all")}
                className="btn-secondary mt-7"
              >
                View All Collections
              </button>
            )}
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 4} />
            ))}
          </div>
        )}
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        products={initialProducts}
        filters={filters}
        onChange={handleFilters}
        onClear={handleClear}
        sort={sort}
        onSortChange={handleSort}
        resultCount={filtered.length}
      />
    </>
  );
}
