import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateCoupon } from "@/lib/coupons";
import { computeQuote, type Quote, type QuoteLine } from "@/lib/pricing";
import { getStoreConfig } from "@/lib/settings";

/**
 * Server-authoritative cart pricing. The client sends nothing but SKU ids and
 * quantities; prices, tax attributes, stock and coupon validity are all read
 * back from the database here. Both `/api/cart/quote` and order creation call
 * this, so the number shown in the drawer is the number that gets charged.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export interface RequestedItem {
  skuId: string;
  quantity: number;
}

export type HydratedSku = {
  id: string;
  size: string;
  color: string | null;
  skuCode: string;
  stock: number;
  isActive: boolean;
  price: Prisma.Decimal;
  product: {
    id: string;
    name: string;
    slug: string;
    collectionId: string | null;
    priceIncludesGst: boolean;
    gstRate: Prisma.Decimal | null;
    gstExempt: boolean;
    images: { url: string }[];
  };
};

export interface StockProblem {
  skuId: string;
  name: string;
  size: string;
  /** How many are actually purchasable right now. 0 = gone. */
  available: number;
}

export interface CartQuoteResult {
  quote: Quote;
  skus: HydratedSku[];
  lines: QuoteLine[];
  /** Lines that can't be fulfilled at the requested quantity. */
  problems: StockProblem[];
  /** Why a submitted coupon was rejected. Null when it applied or none sent. */
  couponError: string | null;
  couponId: string | null;
}

const skuInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      collectionId: true,
      priceIncludesGst: true,
      gstRate: true,
      gstExempt: true,
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  },
} as const;

export async function loadSkus(items: RequestedItem[], db: Db = prisma): Promise<HydratedSku[]> {
  if (items.length === 0) return [];
  return (await db.sKU.findMany({
    where: { id: { in: items.map((i) => i.skuId) } },
    include: skuInclude,
  })) as HydratedSku[];
}

export function toQuoteLine(sku: HydratedSku, quantity: number): QuoteLine {
  return {
    skuId: sku.id,
    productId: sku.product.id,
    collectionId: sku.product.collectionId,
    unitPrice: Number(sku.price),
    quantity,
    priceIncludesGst: sku.product.priceIncludesGst,
    gstRate: sku.product.gstRate == null ? null : Number(sku.product.gstRate),
    gstExempt: sku.product.gstExempt,
  };
}

export interface BuildCartQuoteInput {
  items: RequestedItem[];
  couponCode?: string | null;
  userId?: string | null;
  paymentMethod?: "razorpay" | "cod";
  db?: Db;
}

/**
 * Price a cart. Missing SKUs are dropped (with a problem entry) rather than
 * throwing, so the drawer can show "this piece is no longer available"
 * alongside a correct total for everything else.
 */
export async function buildCartQuote({
  items,
  couponCode = null,
  userId = null,
  paymentMethod = "razorpay",
  db = prisma,
}: BuildCartQuoteInput): Promise<CartQuoteResult> {
  const [config, skus] = await Promise.all([getStoreConfig(), loadSkus(items, db)]);

  const lines: QuoteLine[] = [];
  const problems: StockProblem[] = [];
  const usable: HydratedSku[] = [];

  for (const item of items) {
    const sku = skus.find((s) => s.id === item.skuId);
    if (!sku) {
      problems.push({ skuId: item.skuId, name: "This piece", size: "—", available: 0 });
      continue;
    }

    // A size is unbuyable when it's out of stock or has been pulled by staff.
    const available = sku.isActive ? sku.stock : 0;
    if (available <= 0) {
      problems.push({
        skuId: sku.id,
        name: sku.product.name,
        size: sku.size,
        available: 0,
      });
      continue;
    }
    if (available < item.quantity) {
      problems.push({
        skuId: sku.id,
        name: sku.product.name,
        size: sku.size,
        available,
      });
    }

    // Price whatever we can actually ship.
    const quantity = Math.min(item.quantity, available);
    lines.push(toQuoteLine(sku, quantity));
    usable.push(sku);
  }

  let applied = null;
  let couponError: string | null = null;
  let couponId: string | null = null;

  if (couponCode && lines.length > 0) {
    const result = await evaluateCoupon({ code: couponCode, lines, userId, db });
    if (result.ok) {
      applied = result.applied;
      couponId = result.couponId;
    } else {
      couponError = result.error;
    }
  }

  return {
    quote: computeQuote({ lines, config, coupon: applied, paymentMethod }),
    skus: usable,
    lines,
    problems,
    couponError,
    couponId,
  };
}
