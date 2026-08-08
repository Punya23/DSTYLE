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

/* -------------------------------------------------------------------------- */
/* Admin form                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The admin form holds every numeric field as a string — a half-typed number
 * input has no numeric value, and `datetime-local` speaks its own format. This
 * schema validates that string shape and produces a `CouponInput` the API
 * accepts, so the form and the endpoint still share one definition of "valid".
 */

/** "" means "not set"; anything else must parse as a non-negative number. */
const optionalNumberString = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
      message: `${label} must be a positive number`,
    });

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphen or underscore only"),
    description: z.string().trim().max(160),
    type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING", "BUY_X_GET_Y"]),
    value: optionalNumberString("Discount"),
    maxDiscount: optionalNumberString("Max discount"),
    minOrder: optionalNumberString("Minimum order"),
    buyQty: optionalNumberString("Buy quantity"),
    getQty: optionalNumberString("Free quantity"),
    startsAt: z.string(),
    expiresAt: z.string(),
    usageLimit: optionalNumberString("Total uses"),
    perUserLimit: optionalNumberString("Uses per customer"),
    isActive: z.boolean(),
    firstOrderOnly: z.boolean(),
  })
  // The same cross-field rules `validateCouponRules` enforces server-side, but
  // attached to the field that's actually wrong so the message lands there.
  .refine(
    (v) => v.type !== "PERCENT" || (Number(v.value) > 0 && Number(v.value) <= 100),
    { message: "A percentage discount must be between 1 and 100.", path: ["value"] }
  )
  .refine((v) => v.type !== "FIXED" || Number(v.value) > 0, {
    message: "Enter the rupee amount to take off.",
    path: ["value"],
  })
  .refine((v) => v.type !== "BUY_X_GET_Y" || Number(v.buyQty) > 0, {
    message: "Set the buy quantity.",
    path: ["buyQty"],
  })
  .refine((v) => v.type !== "BUY_X_GET_Y" || Number(v.getQty) > 0, {
    message: "Set the free quantity.",
    path: ["getQty"],
  })
  .refine(
    (v) => !v.startsAt || !v.expiresAt || new Date(v.startsAt) < new Date(v.expiresAt),
    { message: "The expiry date must be after the start date.", path: ["expiresAt"] }
  );

export type CouponFormInput = z.infer<typeof couponFormSchema>;

/** Turn the validated string form into the payload the API expects. */
export function couponFormToPayload(form: CouponFormInput) {
  const numberOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
  const isoOrNull = (v: string) => (v ? new Date(v).toISOString() : null);

  return {
    code: form.code.trim().toUpperCase(),
    description: form.description.trim() || null,
    type: form.type,
    // Only the two amount-based types carry a value; the rest send 0.
    value: form.type === "PERCENT" || form.type === "FIXED" ? Number(form.value || 0) : 0,
    maxDiscount: form.type === "PERCENT" ? numberOrNull(form.maxDiscount) : null,
    minOrder: numberOrNull(form.minOrder),
    buyQty: form.type === "BUY_X_GET_Y" ? numberOrNull(form.buyQty) : null,
    getQty: form.type === "BUY_X_GET_Y" ? numberOrNull(form.getQty) : null,
    startsAt: isoOrNull(form.startsAt),
    expiresAt: isoOrNull(form.expiresAt),
    usageLimit: numberOrNull(form.usageLimit),
    perUserLimit: numberOrNull(form.perUserLimit),
    isActive: form.isActive,
    firstOrderOnly: form.firstOrderOnly,
    collectionIds: [],
    productIds: [],
  };
}

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
