import type { Metadata } from "next";
import { Suspense } from "react";
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

/**
 * Static, refreshed every five minutes.
 *
 * This page used to read `searchParams` — which opts a route out of static
 * rendering entirely — to pre-filter by `?tags=`. That was both a capacity
 * problem (a measured 3.3s of Postgres round trips per visitor, and under load
 * it returned nothing at all) and a bug: `CollectionsPageClient` seeds its own
 * filters from `useSearchParams` and filters `initialProducts` client-side, so
 * narrowing the server query as well meant clearing a filter could not bring
 * the hidden products back — they had never been sent.
 *
 * Serving the full visible catalogue and letting the client filter it fixes
 * both. The legacy `?collection=` facet redirect moved to `next.config.ts`,
 * where it costs nothing per request.
 */
export const revalidate = 300;

export default async function CollectionsPage() {
  const data = await getCollectionsData();

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
      {/* `CollectionsPageClient` reads `useSearchParams` to seed its filters,
          which suspends during prerender. The boundary is what lets the rest of
          this page be static HTML while the filter state resolves in the
          browser. */}
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
