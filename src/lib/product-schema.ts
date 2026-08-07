import { z } from "zod";

/**
 * Product payload shared by the create and update endpoints. Keeping one
 * definition means the admin form can't send a shape only half the API knows
 * how to store.
 */

export const IMAGE_KINDS = [
  "FRONT",
  "BACK",
  "SIDE",
  "CLOSEUP",
  "FABRIC",
  "MODEL",
  "LIFESTYLE",
  "OTHER",
] as const;

export const VIDEO_KINDS = ["REEL", "ROTATION_360", "RAMP_WALK", "DETAIL"] as const;

/** Labels for the admin dropdowns and the PDP gallery captions. */
export const IMAGE_KIND_LABELS: Record<(typeof IMAGE_KINDS)[number], string> = {
  FRONT: "Front",
  BACK: "Back",
  SIDE: "Side",
  CLOSEUP: "Close-up",
  FABRIC: "Fabric detail",
  MODEL: "On model",
  LIFESTYLE: "Lifestyle",
  OTHER: "Other",
};

export const VIDEO_KIND_LABELS: Record<(typeof VIDEO_KINDS)[number], string> = {
  REEL: "Reel",
  ROTATION_360: "360° rotation",
  RAMP_WALK: "Ramp walk",
  DETAIL: "Detail clip",
};

export const skuSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1),
  color: z.string().optional().nullable(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  skuCode: z.string().min(1),
  isActive: z.boolean().default(true),
  lowStockAt: z.number().int().min(0).default(3),
  sortOrder: z.number().int().default(0),
});

export const imageSchema = z.object({
  url: z.string().min(1),
  altText: z.string().optional().nullable(),
  kind: z.enum(IMAGE_KINDS).default("OTHER"),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
});

export const videoSchema = z.object({
  url: z.string().min(1),
  publicId: z.string().optional().nullable(),
  posterUrl: z.string().optional().nullable(),
  kind: z.enum(VIDEO_KINDS).default("REEL"),
  durationSec: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  collectionId: z.string().optional().nullable(),
  basePrice: z.number().positive(),
  /** Compare-at list price. Null = no discount shown. See the refine below. */
  mrp: z.number().nonnegative().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isVisible: z.boolean().default(true),
  isFeatured: z.boolean().default(false),

  // Fashion attributes
  material: z.string().optional().nullable(),
  fabric: z.string().optional().nullable(),
  sleeve: z.string().optional().nullable(),
  neck: z.string().optional().nullable(),
  length: z.string().optional().nullable(),
  careInstr: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),

  // Tax
  priceIncludesGst: z.boolean().default(true),
  gstRate: z.number().min(0).max(100).optional().nullable(),
  gstExempt: z.boolean().default(false),
  hsnCode: z.string().trim().max(12).optional().nullable(),

  skus: z.array(skuSchema).min(1),
  images: z.array(imageSchema).default([]),
  videos: z.array(videoSchema).default([]),
})
  // An MRP under the selling price would advertise a negative saving, so it is
  // a data error rather than a discount. Rejecting it here keeps the storefront
  // free of the check.
  .refine((v) => v.mrp == null || v.mrp >= v.basePrice, {
    message: "MRP must be at least the selling price",
    path: ["mrp"],
  });

export type ProductInput = z.infer<typeof productSchema>;

/* -------------------------------------------------------------------------- */
/* Admin form                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The admin product form. Every numeric field is a string here because a
 * half-typed number input has no numeric value, and the media rows carry
 * client-only bookkeeping (`tempId`, `uploading`) that never reaches the API.
 *
 * `productFormToPayload` below converts a validated form into `ProductInput`,
 * so the browser and the endpoint still agree on what a valid product is.
 */

/** "" is rejected; anything else must parse as a number above zero. */
const requiredPositiveNumberString = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, { message });

export const skuFormSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(),
  size: z.string().trim().min(1, "Size is required"),
  color: z.string(),
  price: requiredPositiveNumberString("Enter a price above zero"),
  stock: z.string(),
  skuCode: z.string().trim().min(1, "SKU code is required"),
  isActive: z.boolean(),
  lowStockAt: z.string(),
});

export const imageFormSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(),
  url: z.string().min(1),
  altText: z.string(),
  kind: z.enum(IMAGE_KINDS),
  sortOrder: z.number().int(),
  isPrimary: z.boolean(),
  uploading: z.boolean().optional(),
});

export const videoFormSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(),
  url: z.string().min(1),
  posterUrl: z.string(),
  kind: z.enum(VIDEO_KINDS),
  durationSec: z.string(),
  sortOrder: z.number().int(),
  uploading: z.boolean().optional(),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, "Product name is required"),
    slug: z.string().trim().min(1, "URL slug is required"),
    description: z.string().trim().min(1, "Description is required"),
    collectionId: z
      .string()
      .min(1, "Choose a collection so the product appears in the right category"),
    basePrice: requiredPositiveNumberString("Enter a price above zero"),
    mrp: z
      .string()
      .trim()
      .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
        message: "MRP must be a number of zero or more",
      }),
    tags: z.string(),
    isVisible: z.boolean(),
    isFeatured: z.boolean(),

    material: z.string(),
    fabric: z.string(),
    sleeve: z.string(),
    neck: z.string(),
    length: z.string(),
    careInstr: z.string(),
    deliveryTime: z.string(),

    priceIncludesGst: z.boolean(),
    gstRate: z
      .string()
      .trim()
      .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
        message: "GST rate must be between 0 and 100",
      }),
    gstExempt: z.boolean(),
    hsnCode: z.string().trim().max(12, "HSN code is at most 12 characters"),

    skus: z.array(skuFormSchema).min(1, "Add at least one size variant"),
    images: z.array(imageFormSchema),
    videos: z.array(videoFormSchema),
  })
  // Mirrors the payload rule, so the admin sees it on the field instead of as
  // a 400 from the API.
  .refine((v) => v.mrp.trim() === "" || Number(v.mrp) >= Number(v.basePrice), {
    message: "MRP must be at least the base price",
    path: ["mrp"],
  })
  // Submitting mid-upload would save rows pointing at URLs that don't exist yet.
  .refine((v) => !v.images.some((i) => i.uploading), {
    message: "Please wait for the image uploads to finish.",
    path: ["images"],
  })
  .refine((v) => !v.videos.some((i) => i.uploading), {
    message: "Please wait for the video uploads to finish.",
    path: ["videos"],
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;

/** Turn the validated string form into the payload the API expects. */
export function productFormToPayload(form: ProductFormInput): ProductInput {
  const orNull = (v: string) => (v.trim() === "" ? null : v);

  return {
    name: form.name,
    slug: form.slug,
    description: form.description,
    collectionId: form.collectionId || null,
    basePrice: Number(form.basePrice),
    mrp: form.mrp.trim() === "" ? null : Number(form.mrp),
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    isVisible: form.isVisible,
    isFeatured: form.isFeatured,

    material: orNull(form.material),
    fabric: orNull(form.fabric),
    sleeve: orNull(form.sleeve),
    neck: orNull(form.neck),
    length: orNull(form.length),
    careInstr: orNull(form.careInstr),
    deliveryTime: orNull(form.deliveryTime),

    priceIncludesGst: form.priceIncludesGst,
    gstRate: form.gstRate.trim() === "" ? null : Number(form.gstRate),
    gstExempt: form.gstExempt,
    hsnCode: orNull(form.hsnCode),

    // `sortOrder` is the on-screen order, so it's derived from the index rather
    // than stored — reordering a row is then just moving it in the array.
    skus: form.skus.map((s, i) => ({
      ...(s.id ? { id: s.id } : {}),
      size: s.size,
      color: orNull(s.color),
      price: Number(s.price),
      stock: parseInt(s.stock, 10) || 0,
      skuCode: s.skuCode,
      isActive: s.isActive,
      lowStockAt: parseInt(s.lowStockAt, 10) || 0,
      sortOrder: i,
    })),
    images: form.images.map((img, i) => ({
      url: img.url,
      altText: orNull(img.altText),
      kind: img.kind,
      sortOrder: i,
      isPrimary: img.isPrimary,
    })),
    videos: form.videos.map((v, i) => ({
      url: v.url,
      posterUrl: orNull(v.posterUrl),
      kind: v.kind,
      durationSec: v.durationSec ? parseInt(v.durationSec, 10) : null,
      sortOrder: i,
    })),
  };
}

/** Scalar columns only — the relation arrays are written separately. */
export function productScalars(data: ProductInput) {
  return {
    name: data.name,
    description: data.description,
    collectionId: data.collectionId ?? null,
    basePrice: data.basePrice,
    mrp: data.mrp ?? null,
    tags: data.tags,
    isVisible: data.isVisible,
    isFeatured: data.isFeatured,
    material: data.material ?? null,
    fabric: data.fabric ?? null,
    sleeve: data.sleeve ?? null,
    neck: data.neck ?? null,
    length: data.length ?? null,
    careInstr: data.careInstr ?? null,
    deliveryTime: data.deliveryTime ?? null,
    priceIncludesGst: data.priceIncludesGst,
    gstRate: data.gstRate ?? null,
    gstExempt: data.gstExempt,
    hsnCode: data.hsnCode || null,
  };
}
