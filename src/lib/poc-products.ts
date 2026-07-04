import type { Product } from "@/types";
import { POC_PRODUCTS } from "@/data/poc-products";

export type PocProduct = Product & { isActive: boolean };

export function getPocProductBySlug(slug: string): PocProduct | undefined {
  const product = POC_PRODUCTS.find((p) => p.slug === slug);
  if (!product) return undefined;
  const isActive = slug === "tassel-work-lehenga" || slug === "auspicious-hue-lehenga";
  return { ...product, isActive };
}

export function getRelatedPocProducts(slug: string, limit = 4): Product[] {
  const current = POC_PRODUCTS.find((p) => p.slug === slug);
  return POC_PRODUCTS.filter(
    (p) =>
      p.slug !== slug &&
      (current?.collection ? p.collection?.slug === current.collection.slug : true)
  ).slice(0, limit);
}
