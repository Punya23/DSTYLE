import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-rules";

/**
 * Account and storefront form shapes, shared by the React Hook Form resolvers
 * in the browser and the route handlers on the server.
 *
 * One definition per payload is the whole point: previously the form decided
 * what to send and the route independently decided what to accept, so a rule
 * change on either side silently drifted. Nothing here may import from
 * `node:crypto`, Prisma, or anything else server-only — these modules end up in
 * the client bundle.
 */

/* -------------------------------------------------------------------------- */
/* Shared field rules                                                          */
/* -------------------------------------------------------------------------- */

/** Loose on purpose — Indian numbers get written with spaces, +91 and brackets. */
const phone = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number");

/** An optional free-text field where the empty string means "not provided". */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  phone: phone.optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/* -------------------------------------------------------------------------- */
/* Password                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What the API accepts. `currentPassword` is optional because magic-link and
 * Google accounts are setting a password for the first time and have none.
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/**
 * What the form validates. Adds the confirmation field, which exists only in the
 * UI — there is nothing for the server to do with it.
 *
 * Built per-account rather than as a constant: whether `currentPassword` is
 * required depends on whether the account has one, and a resolver overrides any
 * `required` rule passed to `register`, so the condition has to live here.
 */
export function passwordFormSchemaFor(hasPassword: boolean) {
  return z
    .object({
      currentPassword: hasPassword
        ? z.string().min(1, "Enter your current password")
        : z.string().optional(),
      newPassword: z
        .string()
        .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
        .max(200, "Password must be under 200 characters.")
        .regex(/[a-zA-Z]/, "Password must contain at least one letter and one number.")
        .regex(/[0-9]/, "Password must contain at least one letter and one number."),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, {
      message: "The two passwords don't match.",
      path: ["confirmPassword"],
    });
}

/**
 * `currentPassword` is always present as a key (the field is registered either
 * way) but is undefined for accounts that don't have one yet — which is exactly
 * what the conditional schema above produces.
 */
export type PasswordFormInput = {
  currentPassword: string | undefined;
  newPassword: string;
  confirmPassword: string;
};

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1, "Pick a rating").max(5),
  title: optionalText(120),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters.")
    .max(2000),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/* -------------------------------------------------------------------------- */
/* Returns                                                                     */
/* -------------------------------------------------------------------------- */

export const returnRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(1, "Pick a reason").max(120),
  comment: optionalText(1000),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "Select at least one item to return"),
});

export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Guest order tracking                                                        */
/* -------------------------------------------------------------------------- */

export const trackOrderSchema = z.object({
  reference: z.string().trim().min(4, "Enter your order reference").max(40),
  email: z.string().trim().email("Enter the email used on the order"),
});

export type TrackOrderInput = z.infer<typeof trackOrderSchema>;

/* -------------------------------------------------------------------------- */
/* Store settings (admin)                                                      */
/* -------------------------------------------------------------------------- */

export const storeSettingsSchema = z.object({
  gstEnabled: z.boolean(),
  pricesIncludeGst: z.boolean(),
  gstLowRate: z.number().min(0, "Rate can't be negative").max(100, "Rate can't exceed 100%"),
  gstHighRate: z.number().min(0, "Rate can't be negative").max(100, "Rate can't exceed 100%"),
  gstSlabThreshold: z.number().min(0, "Threshold can't be negative"),
  shippingFlat: z.number().min(0, "Shipping can't be negative"),
  freeShippingThreshold: z.number().min(0, "Threshold can't be negative"),
  codFee: z.number().min(0, "Fee can't be negative"),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

/* -------------------------------------------------------------------------- */
/* Newsletter                                                                  */
/* -------------------------------------------------------------------------- */

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
