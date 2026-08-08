/**
 * Money maths for the whole shop — cart drawer, checkout, order creation and
 * invoices all go through here so a total can never disagree with itself.
 *
 * Everything in this file is pure and dependency-free, which is what lets the
 * client render a live preview while the server recomputes the authoritative
 * number from the database at order time.
 *
 * Rounding rule: every rupee value is rounded to 2 decimals at the moment it
 * is produced, and the grand total is the sum of already-rounded parts. That
 * keeps `subtotal - discount + tax + shipping === total` exactly true, which
 * matters because Razorpay is charged in integer paise.
 */

export interface StoreConfig {
  gstEnabled: boolean;
  /** Default for products that don't override it. */
  pricesIncludeGst: boolean;
  /** GST % for items at or below the slab threshold. */
  gstLowRate: number;
  /** GST % for items above the slab threshold. */
  gstHighRate: number;
  /** Per-piece price at which the rate steps up. */
  gstSlabThreshold: number;
  shippingFlat: number;
  freeShippingThreshold: number;
  codFee: number;
}

/**
 * Indian apparel GST as of the 2025 rate revision: 5% up to ₹2,500 a piece,
 * 18% above. Admin can change all of it in Settings.
 */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  gstEnabled: true,
  pricesIncludeGst: true,
  gstLowRate: 5,
  gstHighRate: 18,
  gstSlabThreshold: 2500,
  shippingFlat: 299,
  freeShippingThreshold: 5000,
  codFee: 0,
};

/** One cart line, with the tax attributes copied off its product. */
export interface QuoteLine {
  skuId: string;
  productId: string;
  collectionId?: string | null;
  /** Listed unit price, exactly as shown on the storefront. */
  unitPrice: number;
  quantity: number;
  /** Product-level override of `StoreConfig.pricesIncludeGst`. */
  priceIncludesGst?: boolean;
  /** Product-level GST % override. Null/undefined = use the slab. */
  gstRate?: number | null;
  gstExempt?: boolean;
}

export interface QuoteLineResult {
  skuId: string;
  quantity: number;
  unitPrice: number;
  /** unitPrice × quantity, before discount. */
  gross: number;
  /** Share of the order discount attributed to this line. */
  discount: number;
  taxRate: number;
  /** Pre-tax value of the line after discount. */
  taxable: number;
  taxAmount: number;
  /** What the customer pays for this line. */
  lineTotal: number;
}

export interface AppliedCoupon {
  code: string;
  /** Human-readable summary, e.g. "10% off" or "Buy 2 get 1 free". */
  label: string;
  discount: number;
  freeShipping: boolean;
}

export interface Quote {
  lines: QuoteLineResult[];
  /** Sum of listed line prices, before discount. */
  subtotal: number;
  discount: number;
  /** Pre-tax value of everything after discount. */
  taxableValue: number;
  tax: number;
  shipping: number;
  codFee: number;
  total: number;
  /**
   * True when tax is already contained in `subtotal` rather than added on
   * top — the UI phrases the line as "Includes GST" instead of "GST".
   */
  taxInclusive: boolean;
  coupon: AppliedCoupon | null;
  /** How much more to spend to unlock free shipping. 0 once unlocked. */
  freeShippingGap: number;
}

/** Round to paise. Guards against `-0` and float dust like 1249.9999999998. */
export function round2(n: number): number {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

/**
 * Saving to advertise against a compare-at price, in whole percent.
 *
 * Null whenever there is nothing honest to show — no MRP recorded, or one that
 * doesn't actually beat the selling price — so a caller can gate the whole
 * badge on a single non-null check.
 */
export function discountPercent(price: number, mrp?: number | null): number | null {
  if (mrp == null || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * GST rate for a single line, in percent. Product override beats the slab;
 * an exempt product or a store with GST switched off is always 0.
 */
export function gstRateFor(line: QuoteLine, cfg: StoreConfig): number {
  if (!cfg.gstEnabled || line.gstExempt) return 0;
  if (line.gstRate != null) return line.gstRate;
  return line.unitPrice > cfg.gstSlabThreshold ? cfg.gstHighRate : cfg.gstLowRate;
}

/**
 * Spread a rupee discount across lines in proportion to their value, so each
 * line carries its fair share on the invoice. The rounding remainder lands on
 * the largest line, which guarantees the parts sum back to `discount`.
 */
export function allocateDiscount(lines: QuoteLine[], discount: number): number[] {
  const grosses = lines.map((l) => l.unitPrice * l.quantity);
  const totalGross = grosses.reduce((s, g) => s + g, 0);
  if (discount <= 0 || totalGross <= 0) return lines.map(() => 0);

  // Never discount below zero, however generous the coupon.
  const capped = Math.min(discount, totalGross);
  const shares = grosses.map((g) => round2((g / totalGross) * capped));

  const drift = round2(capped - shares.reduce((s, v) => s + v, 0));
  if (drift !== 0) {
    let biggest = 0;
    for (let i = 1; i < grosses.length; i++) {
      if (grosses[i] > grosses[biggest]) biggest = i;
    }
    shares[biggest] = round2(shares[biggest] + drift);
  }
  return shares;
}

export interface QuoteInput {
  lines: QuoteLine[];
  config?: StoreConfig;
  coupon?: AppliedCoupon | null;
  paymentMethod?: "razorpay" | "cod";
  /** Skip shipping entirely (e.g. a store-pickup order). */
  skipShipping?: boolean;
}

/**
 * Turn cart lines into a fully broken-down bill.
 *
 * GST is charged on the *discounted* value, which is what the law requires
 * when the discount is shown on the invoice. Shipping is judged against the
 * post-discount subtotal, so a coupon can legitimately push an order under
 * the free-shipping threshold.
 */
export function computeQuote({
  lines,
  config = DEFAULT_STORE_CONFIG,
  coupon = null,
  paymentMethod = "razorpay",
  skipShipping = false,
}: QuoteInput): Quote {
  const discountShares = allocateDiscount(lines, coupon?.discount ?? 0);

  const results: QuoteLineResult[] = lines.map((line, i) => {
    const gross = round2(line.unitPrice * line.quantity);
    const discount = discountShares[i] ?? 0;
    const net = round2(gross - discount);
    const taxRate = gstRateFor(line, config);
    const inclusive = line.priceIncludesGst ?? config.pricesIncludeGst;

    let taxable: number;
    let taxAmount: number;
    let lineTotal: number;

    if (taxRate === 0) {
      taxable = net;
      taxAmount = 0;
      lineTotal = net;
    } else if (inclusive) {
      // Price already contains tax — back it out of the net amount.
      taxable = round2(net / (1 + taxRate / 100));
      taxAmount = round2(net - taxable);
      lineTotal = net;
    } else {
      taxable = net;
      taxAmount = round2(net * (taxRate / 100));
      lineTotal = round2(net + taxAmount);
    }

    return {
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      gross,
      discount,
      taxRate,
      taxable,
      taxAmount,
      lineTotal,
    };
  });

  const sum = (pick: (r: QuoteLineResult) => number) =>
    round2(results.reduce((s, r) => s + pick(r), 0));

  const subtotal = sum((r) => r.gross);
  const discount = sum((r) => r.discount);
  const taxableValue = sum((r) => r.taxable);
  const tax = sum((r) => r.taxAmount);
  const itemsTotal = sum((r) => r.lineTotal);

  const netSubtotal = round2(subtotal - discount);
  const qualifiesFree = netSubtotal >= config.freeShippingThreshold;
  const shipping =
    skipShipping || qualifiesFree || coupon?.freeShipping
      ? 0
      : round2(config.shippingFlat);

  const codFee = paymentMethod === "cod" ? round2(config.codFee) : 0;

  // A store can mix inclusive and exclusive products; the summary line is
  // phrased as "included" only when nothing was added on top.
  const taxInclusive = results.every((r, i) => {
    if (r.taxRate === 0) return true;
    return lines[i].priceIncludesGst ?? config.pricesIncludeGst;
  });

  return {
    lines: results,
    subtotal,
    discount,
    taxableValue,
    tax,
    shipping,
    codFee,
    total: round2(itemsTotal + shipping + codFee),
    taxInclusive,
    coupon,
    freeShippingGap: qualifiesFree
      ? 0
      : round2(config.freeShippingThreshold - netSubtotal),
  };
}
