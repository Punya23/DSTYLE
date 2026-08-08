import type { Metadata } from "next";
import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import { CollectionsPageClient } from "@/components/store/CollectionsPageClient";
import { CollectionHero } from "@/components/store/CollectionHero";
import { JsonLd } from "@/components/JsonLd";
import { getCollectionsData } from "@/lib/collections";
import { pageMetadata } from "@/lib/seo";
import { collectionPageSchema, itemListSchema, breadcrumbSchema } from "@/lib/structured-data";

const DESCRIPTION =
  "Browse every Dstyle collection — bridal lehengas, festive ensembles, cocktail gowns and everyday pret, hand-finished in our Mumbai atelier.";

export const metadata: Metadata = pageMetadata({
  title: "Collections",
  description: DESCRIPTION,
  path: "/collections",
});

interface CollectionsPageProps {
  searchParams: Promise<{ collection?: string; tags?: string }>;
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const params = await searchParams;

  // `?collection=` was the old facet URL. Collapse it into the real route
  // rather than serving the same products at two addresses.
  if (params.collection && params.collection !== "all") {
    permanentRedirect(`/collections/${params.collection}`);
  }

  const tags = params.tags ? params.tags.split(",") : undefined;
  const data = await getCollectionsData(undefined, tags);

  return (
    <div className="pt-[64px] sm:pt-[76px] bg-brand-ivory min-h-screen">
      <JsonLd
        data={[
          collectionPageSchema("Collections", DESCRIPTION, "/collections"),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
          ]),
          itemListSchema(
            data.products.slice(0, 60).map((p) => ({
              name: p.name,
              path: `/products/${p.slug}`,
              image: p.images[0]?.url,
            })),
            "Dstyle Collections"
          ),
        ]}
      />
      <CollectionHero
        eyebrow="The House of Dstyle"
        title="Collections"
        description={DESCRIPTION}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Collections" },
        ]}
      />
      {/* `CollectionsPageClient` reads `useSearchParams` to seed its filters.
          Both collection routes already await `searchParams`, so they render
          dynamically and this boundary never falls back — it is here so the
          build can't break if either route is ever made static. */}
      <Suspense fallback={null}>
        <CollectionsPageClient
          initialProducts={data.products}
          collections={data.collections}
          activeCollection="all"
        />
      </Suspense>
    </div>
  );
}
