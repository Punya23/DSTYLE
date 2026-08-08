import type { Prisma } from "@/generated/prisma/client";
import type { Product } from "@/types";

/**
 * Exactly the columns `<ProductCard />` reads. Shared by every endpoint that
 * feeds a product grid (wishlist, recently viewed) so the card never has to
 * cope with a partially-populated product.
 */
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  mrp: true,
  tags: true,
  images: { orderBy: { sortOrder: "asc" } },
  skus: true,
  collection: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductSelect;

type RawProductCard = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export type ProductCardData = Pick<
  Product,
  "id" | "name" | "slug" | "basePrice" | "mrp" | "images" | "tags" | "skus" | "collection"
>;

/** Prisma returns `Decimal` for money columns; the card expects plain numbers. */
export function toProductCard(p: RawProductCard): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    basePrice: Number(p.basePrice),
    mrp: p.mrp == null ? null : Number(p.mrp),
    tags: p.tags,
    images: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      altText: i.altText,
      sortOrder: i.sortOrder,
      isPrimary: i.isPrimary,
    })),
    skus: p.skus.map((s) => ({
      id: s.id,
      size: s.size,
      color: s.color,
      skuCode: s.skuCode,
      stock: s.stock,
      price: Number(s.price),
      mrp: s.mrp == null ? null : Number(s.mrp),
    })),
    collection: p.collection,
  };
}
