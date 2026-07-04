import type { Metadata } from "next";
import { CollectionsPageClient } from "@/components/store/CollectionsPageClient";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse all Dstyle collections — bridal, festive, cocktail, and pret.",
};

async function getCollectionsData(
  collectionSlug?: string,
  tags?: string[]
): Promise<{ collections: Awaited<ReturnType<typeof prisma.collection.findMany>>; products: Product[] }> {
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
    const products: Product[] = rawProducts.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
      skus: p.skus.map((s) => ({ ...s, price: Number(s.price) })),
    }));
    return { collections, products };
  } catch {
    return { collections: [], products: [] };
  }
}

interface CollectionsPageProps {
  searchParams: Promise<{ collection?: string; tags?: string }>;
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const params = await searchParams;
  const tags = params.tags ? params.tags.split(",") : undefined;
  const data = await getCollectionsData(params.collection, tags);

  return (
    <div className="pt-[64px] sm:pt-[76px] bg-brand-ivory min-h-screen">
      <CollectionsPageClient
        initialProducts={data.products}
        collections={data.collections}
        activeCollection={params.collection ?? "all"}
      />
    </div>
  );
}
