import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

export interface CollectionsData {
  collections: Awaited<ReturnType<typeof prisma.collection.findMany>>;
  products: Product[];
}

/**
 * Products for the collections browser, optionally narrowed to one collection
 * or a set of tags. Shared by `/collections` and `/collections/[slug]` so the
 * two routes can never drift apart in what they show.
 */
export async function getCollectionsData(
  collectionSlug?: string,
  tags?: string[]
): Promise<CollectionsData> {
  try {
    const [collections, rawProducts] = await Promise.all([
      prisma.collection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: {
          isVisible: true,
          ...(collectionSlug && collectionSlug !== "all"
            ? { collection: { slug: collectionSlug } }
            : {}),
          ...(tags && tags.length > 0 ? { tags: { hasSome: tags } } : {}),
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          skus: true,
          collection: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Prisma hands back `Decimal` for every money column, including the
    // optional compare-at price; the UI wants plain numbers.
    const products: Product[] = rawProducts.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      mrp: p.mrp == null ? null : Number(p.mrp),
      skus: p.skus.map((s) => ({
        ...s,
        price: Number(s.price),
        mrp: s.mrp == null ? null : Number(s.mrp),
      })),
    }));
    return { collections, products };
  } catch {
    // DB unavailable — render an empty browser rather than a 500.
    return { collections: [], products: [] };
  }
}

/** One visible collection by slug, or null. */
export async function getCollectionBySlug(slug: string) {
  try {
    return await prisma.collection.findFirst({
      where: { slug, isVisible: true },
    });
  } catch {
    return null;
  }
}
