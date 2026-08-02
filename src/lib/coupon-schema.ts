import { z } from "zod";

/**
 * Validation shared by the coupon create and update endpoints and by the
 * admin form, so the rules can't drift between what the UI allows and what
 * the API accepts.
 */
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphen or underscore only"),
  description: z.string().trim().max(160).optional().nullable(),
  type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"]),
  value: z.number().min(0).default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  minOrder: z.number().min(0).optional().nullable(),
  buyQty: z.number().int().positive().optional().nullable(),
  getQty: z.number().int().positive().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  firstOrderOnly: z.boolean().default(false),
  collectionIds: z.array(z.string()).default([]),
  productIds: z.array(z.string()).default([]),
});

export type CouponInput = z.infer<typeof couponSchema>;

/** Cross-field rules the shape alone can't express. */
export function validateCouponRules(data: CouponInput): string | null {
  if (data.type === "PERCENT" && (data.value <= 0 || data.value > 100)) {
    return "A percentage discount must be between 1 and 100.";
  }
  if (data.type === "FIXED" && data.value <= 0) {
    return "Enter the rupee amount to take off.";
  }
  if (data.type === "BUY_X_GET_Y" && (!data.buyQty || !data.getQty)) {
    return "Set both the buy quantity and the free quantity.";
  }
  if (data.startsAt && data.expiresAt && data.startsAt >= data.expiresAt) {
    return "The expiry date must be after the start date.";
  }
  return null;
}

/** Human summary of what a coupon does — used in admin lists and the cart. */
export function couponSummary(coupon: {
  type: string;
  value: number;
  buyQty?: number | null;
  getQty?: number | null;
}): string {
  switch (coupon.type) {
    case "PERCENT":
      return `${coupon.value}% off`;
    case "FIXED":
      return `₹${coupon.value.toLocaleString("en-IN")} off`;
    case "FREE_SHIPPING":
      return "Free shipping";
    case "BUY_X_GET_Y":
      return `Buy ${coupon.buyQty ?? 0} get ${coupon.getQty ?? 0} free`;
    default:
      return "Discount";
  }
}
