import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CollectionsPageClient } from "@/components/store/CollectionsPageClient";
import { CollectionHero } from "@/components/store/CollectionHero";
import { JsonLd } from "@/components/JsonLd";
import { getCollectionsData, getCollectionBySlug } from "@/lib/collections";
import { pageMetadata, SITE } from "@/lib/seo";
import { collectionPageSchema, itemListSchema, breadcrumbSchema } from "@/lib/structured-data";
import { prisma } from "@/lib/prisma";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Static per collection, refreshed every five minutes — see the note in
 * `app/collections/page.tsx` for why the `?tags=` server-side narrowing was
 * removed. `generateStaticParams` below was already here but had no effect
 * while the route read `searchParams`.
 */
export const revalidate = 300;

/**
 * Pre-render every visible collection. The list is small and changes rarely,
 * so the pages are static HTML with their metadata already in the document —
 * no streamed metadata for crawlers to wait on.
 */
export async function generateStaticParams() {
  try {
    const collections = await prisma.collection.findMany({
      where: { isVisible: true },
      select: { slug: true },
    });
    return collections.map((c) => ({ slug: c.slug }));
  } catch {
    // No DB at build time — the route still renders on demand.
    return [];
  }
}

function describe(name: string, description: string | null): string {
  return (
    description ??
    `Shop the ${name} collection from ${SITE.name} — hand-finished Indian couture, made in our Mumbai atelier.`
  );
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};

  return pageMetadata({
    title: collection.name,
    description: describe(collection.name, collection.description),
    path: `/collections/${slug}`,
    ...(collection.bannerImage
      ? { images: [{ url: collection.bannerImage, alt: collection.name }] }
      : {}),
  });
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const data = await getCollectionsData(slug);
  const description = describe(collection.name, collection.description);

  return (
    <div className="pt-[64px] sm:pt-[76px] bg-brand-ivory min-h-screen">
      <JsonLd
        data={[
          collectionPageSchema(collection.name, description, `/collections/${slug}`),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collection.name, path: `/collections/${slug}` },
          ]),
          itemListSchema(
            data.products.slice(0, 60).map((p) => ({
              name: p.name,
              path: `/products/${p.slug}`,
              image: p.images[0]?.url,
            })),
            collection.name
          ),
        ]}
      />
      <CollectionHero
        eyebrow="Collection"
        title={collection.name}
        description={description}
        bannerImage={collection.bannerImage}
        slug={slug}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/collections" },
          { label: collection.name },
        ]}
      />
      {/* See the note in /collections/page.tsx — the boundary guards
          `useSearchParams` in the client browser below. */}
      <Suspense fallback={null}>
        <CollectionsPageClient
          initialProducts={data.products}
          collections={data.collections}
          activeCollection={slug}
        />
      </Suspense>
    </div>
  );
}
