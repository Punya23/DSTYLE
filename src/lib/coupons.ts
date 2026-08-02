import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, type AppliedCoupon, type QuoteLine } from "@/lib/pricing";

/**
 * Coupon engine. Every rule the admin can configure — window, usage caps,
 * minimum order, catalogue scope — is enforced here, and this same function
 * runs again inside the order transaction. A code therefore cannot be
 * over-redeemed by two checkouts racing each other.
 */

/** Works with both the top-level client and an interactive transaction. */
type Db = Prisma.TransactionClient | typeof prisma;

export type CouponResult =
  | { ok: true; couponId: string; applied: AppliedCoupon }
  | { ok: false; error: string };

/** Order statuses that count as a real, revenue-bearing order. */
const REDEEMED_STATUSES = ["PAID", "PACKED", "SHIPPED", "DELIVERED"] as const;

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: Prisma.Decimal;
  maxDiscount: Prisma.Decimal | null;
  minOrder: Prisma.Decimal | null;
  buyQty: number | null;
  getQty: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usageCount: number;
  isActive: boolean;
  firstOrderOnly: boolean;
  collectionIds: string[];
  productIds: string[];
};

/** A coupon with no scope applies to everything; otherwise the line must match. */
function isEligible(line: QuoteLine, coupon: CouponRow): boolean {
  const scoped = coupon.productIds.length > 0 || coupon.collectionIds.length > 0;
  if (!scoped) return true;
  if (coupon.productIds.includes(line.productId)) return true;
  return !!line.collectionId && coupon.collectionIds.includes(line.collectionId);
}

/**
 * Buy-X-get-Y: for every (X + Y) eligible units, the Y cheapest are free.
 * Units are pooled across products so "Buy 2 get 1" works on a mixed bag,
 * and the discount is always the *cheapest* units — the industry norm and
 * the interpretation that can't be gamed.
 */
function buyXGetYDiscount(lines: QuoteLine[], buyQty: number, getQty: number): number {
  const units: number[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) units.push(line.unitPrice);
  }
  if (units.length === 0) return 0;

  units.sort((a, b) => a - b);
  const groupSize = buyQty + getQty;
  const freeUnits = Math.floor(units.length / groupSize) * getQty;
  if (freeUnits <= 0) return 0;

  return round2(units.slice(0, freeUnits).reduce((s, p) => s + p, 0));
}

function describe(coupon: CouponRow): string {
  switch (coupon.type) {
    case "PERCENT":
      return `${Number(coupon.value)}% off`;
    case "FIXED":
      return `₹${Number(coupon.value).toLocaleString("en-IN")} off`;
    case "FREE_SHIPPING":
      return "Free shipping";
    case "BUY_X_GET_Y":
      return `Buy ${coupon.buyQty ?? 0} get ${coupon.getQty ?? 0} free`;
    default:
      return "Discount applied";
  }
}

export interface EvaluateCouponInput {
  code: string;
  lines: QuoteLine[];
  /** Null for a guest — per-user limits and first-order rules are then skipped. */
  userId?: string | null;
  db?: Db;
}

/**
 * Validate a code against a specific cart and work out what it's worth.
 * Returns a customer-facing message on every rejection path.
 */
export async function evaluateCoupon({
  code,
  lines,
  userId = null,
  db = prisma,
}: EvaluateCouponInput): Promise<CouponResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, error: "Enter a coupon code." };
  if (lines.length === 0) return { ok: false, error: "Your bag is empty." };

  const coupon = (await db.coupon.findUnique({
    where: { code: normalized },
  })) as CouponRow | null;

  if (!coupon || !coupon.isActive) {
    return { ok: false, error: "That coupon code isn't valid." };
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { ok: false, error: "This coupon isn't active yet." };
  }
  if (coupon.expiresAt && coupon.expiresAt <= now) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, error: "This coupon has been fully redeemed." };
  }

  const subtotal = round2(
    lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  );
  if (coupon.minOrder != null && subtotal < Number(coupon.minOrder)) {
    const short = Number(coupon.minOrder) - subtotal;
    return {
      ok: false,
      error: `Add ₹${short.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })} more to use this coupon (minimum order ₹${Number(
        coupon.minOrder
      ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}).`,
    };
  }

  if (userId) {
    if (coupon.perUserLimit != null) {
      const used = await db.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      });
      if (used >= coupon.perUserLimit) {
        return { ok: false, error: "You've already used this coupon." };
      }
    }
    if (coupon.firstOrderOnly) {
      const prior = await db.order.count({
        where: { userId, status: { in: [...REDEEMED_STATUSES] } },
      });
      if (prior > 0) {
        return { ok: false, error: "This coupon is for first orders only." };
      }
    }
  } else if (coupon.firstOrderOnly || coupon.perUserLimit != null) {
    return { ok: false, error: "Please sign in to use this coupon." };
  }

  const eligible = lines.filter((l) => isEligible(l, coupon));
  if (eligible.length === 0) {
    return { ok: false, error: "This coupon doesn't apply to anything in your bag." };
  }
  const eligibleSubtotal = round2(
    eligible.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  );

  let discount = 0;
  let freeShipping = false;

  switch (coupon.type) {
    case "PERCENT": {
      discount = round2(eligibleSubtotal * (Number(coupon.value) / 100));
      if (coupon.maxDiscount != null) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
      break;
    }
    case "FIXED": {
      discount = Math.min(round2(Number(coupon.value)), eligibleSubtotal);
      break;
    }
    case "FREE_SHIPPING": {
      freeShipping = true;
      break;
    }
    case "BUY_X_GET_Y": {
      const buyQty = coupon.buyQty ?? 0;
      const getQty = coupon.getQty ?? 0;
      if (buyQty <= 0 || getQty <= 0) {
        return { ok: false, error: "That coupon code isn't valid." };
      }
      discount = buyXGetYDiscount(eligible, buyQty, getQty);
      if (discount <= 0) {
        return {
          ok: false,
          error: `Add ${buyQty + getQty} eligible pieces to your bag to use this coupon.`,
        };
      }
      break;
    }
    default:
      return { ok: false, error: "That coupon code isn't valid." };
  }

  if (discount <= 0 && !freeShipping) {
    return { ok: false, error: "This coupon has no effect on your bag." };
  }

  return {
    ok: true,
    couponId: coupon.id,
    applied: {
      code: coupon.code,
      label: describe(coupon),
      discount: round2(discount),
      freeShipping,
    },
  };
}

/**
 * Record a redemption once an order is actually paid. Idempotent via the
 * unique (couponId, orderId) pair, so the client verify call and the Razorpay
 * webhook can both invoke it without double-counting `usageCount`.
 */
export async function redeemCoupon(
  db: Db,
  args: { couponId: string; userId: string; orderId: string; amount: number }
): Promise<boolean> {
  const existing = await db.couponRedemption.findUnique({
    where: { couponId_orderId: { couponId: args.couponId, orderId: args.orderId } },
    select: { id: true },
  });
  if (existing) return false;

  await db.couponRedemption.create({
    data: {
      couponId: args.couponId,
      userId: args.userId,
      orderId: args.orderId,
      amount: args.amount,
    },
  });
  await db.coupon.update({
    where: { id: args.couponId },
    data: { usageCount: { increment: 1 } },
  });
  return true;
}
