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
});

export type ProductInput = z.infer<typeof productSchema>;

/** Scalar columns only — the relation arrays are written separately. */
export function productScalars(data: ProductInput) {
  return {
    name: data.name,
    description: data.description,
    collectionId: data.collectionId ?? null,
    basePrice: data.basePrice,
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
