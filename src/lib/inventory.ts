/**
 * Size-level availability. Stock lives on the SKU (one row per size/colour),
 * so "is this size buyable" is always *derived* — never a flag someone has to
 * remember to flip. A size disappears from sale the instant its count hits 0
 * and comes back on its own when stock is replenished.
 */

export interface StockLike {
  id: string;
  size: string;
  color: string | null;
  stock: number;
  price: number;
  /** Manual override — lets staff pull a size without zeroing real stock. */
  isActive?: boolean;
  lowStockAt?: number;
  sortOrder?: number;
}

export interface SizeAvailability {
  skuId: string;
  size: string;
  color: string | null;
  price: number;
  stock: number;
  /** Sellable right now: in stock and not manually disabled. */
  available: boolean;
  /** In stock, but at or under the alert threshold. */
  lowStock: boolean;
  /** Zero stock — distinct from `disabled`, which is a staff decision. */
  soldOut: boolean;
  disabled: boolean;
}

const DEFAULT_LOW_STOCK_AT = 3;

/** Canonical size order, so S / M / L / XL never renders alphabetically. */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL", "FREE"];

export function sizeRank(size: string): number {
  const idx = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  if (idx !== -1) return idx;
  // Numeric sizes (38, 40, …) sort after named ones, by value.
  const numeric = parseFloat(size);
  return Number.isFinite(numeric) ? 1000 + numeric : 9999;
}

export function isBuyable(sku: StockLike): boolean {
  return (sku.isActive ?? true) && sku.stock > 0;
}

export function toAvailability(sku: StockLike): SizeAvailability {
  const threshold = sku.lowStockAt ?? DEFAULT_LOW_STOCK_AT;
  const disabled = !(sku.isActive ?? true);
  const soldOut = sku.stock <= 0;
  return {
    skuId: sku.id,
    size: sku.size,
    color: sku.color,
    price: sku.price,
    stock: sku.stock,
    available: !disabled && !soldOut,
    lowStock: !soldOut && sku.stock <= threshold,
    soldOut,
    disabled,
  };
}

/** Availability for every variant, in display order. */
export function availabilityFor(skus: StockLike[]): SizeAvailability[] {
  return [...skus]
    .sort((a, b) => {
      const explicit = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (explicit !== 0) return explicit;
      const bySize = sizeRank(a.size) - sizeRank(b.size);
      if (bySize !== 0) return bySize;
      return (a.color ?? "").localeCompare(b.color ?? "");
    })
    .map(toAvailability);
}

/** A product is sold out when no variant is buyable. */
export function isSoldOut(skus: StockLike[]): boolean {
  return skus.every((s) => !isBuyable(s));
}

/** Lowest price among buyable variants, falling back to the overall lowest. */
export function fromPrice(skus: StockLike[]): number {
  const buyable = skus.filter(isBuyable);
  const pool = buyable.length > 0 ? buyable : skus;
  if (pool.length === 0) return 0;
  return Math.min(...pool.map((s) => s.price));
}
