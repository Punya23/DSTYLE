import { BrandStory } from "@/components/store/BrandStory";
import { CategoryTiles, type CategoryTile } from "@/components/store/CategoryTiles";
import { HeroSection } from "@/components/store/HeroSection";
import { ProductRail } from "@/components/store/ProductRail";
import { StatementBand } from "@/components/store/StatementBand";
import { COLLECTION_BANNERS } from "@/data/demo-assets";
import { POC_PRODUCTS } from "@/data/poc-products";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

// Re-generate the homepage at most once a minute so newly-featured products
// (added via the admin panel) appear without a redeploy, while staying fast.
export const revalidate = 60;

/** How many cards a collection needs before it earns its own rail. */
const MIN_RAIL_PRODUCTS = 3;
/** Two collection rails max — past that the page stops being a storefront. */
const MAX_COLLECTION_RAILS = 2;
/** One pull, sliced in memory. Comfortably covers every rail on the page. */
const PRODUCT_POOL = 48;
const RAIL_SIZE = 12;

/** Shown when the database is unreachable, alongside POC_PRODUCTS. */
const FALLBACK_TILES: CategoryTile[] = [
  { id: "c1", name: "Bridal", slug: "bridal", tagline: "For the forever moment" },
  { id: "c2", name: "Festive", slug: "festive", tagline: "Celebrate in colour" },
  { id: "c3", name: "Cocktail", slug: "cocktail", tagline: "Evening glamour" },
  { id: "c4", name: "Pret", slug: "pret", tagline: "Everyday luxury" },
].map((c) => ({ ...c, image: COLLECTION_BANNERS[c.slug] ?? null }));

interface HomeData {
  tiles: CategoryTile[];
  newIn: Product[];
  featured: Product[];
  collectionRails: { tile: CategoryTile; products: Product[] }[];
}

function fetchHomeRecords() {
  return Promise.all([
    prisma.collection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        bannerImage: true,
      },
    }),
    prisma.product.findMany({
      where: { isVisible: true },
      take: PRODUCT_POOL,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        skus: true,
        collection: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
}

type RawProduct = Awaited<ReturnType<typeof fetchHomeRecords>>[1][number];

/** Prisma hands back `Decimal` for every money column; the UI wants numbers. */
function toProduct(p: RawProduct): Product {
  return {
    ...p,
    basePrice: Number(p.basePrice),
    mrp: p.mrp == null ? null : Number(p.mrp),
    skus: p.skus.map((s) => ({
      ...s,
      price: Number(s.price),
      mrp: s.mrp == null ? null : Number(s.mrp),
    })),
  };
}

/**
 * Everything the homepage renders, in two queries. The rails are slices of a
 * single product pull rather than a query each — at this catalogue size the
 * round-trips cost more than the rows do.
 */
async function getHomeData(): Promise<HomeData> {
  const [collections, rawProducts] = await fetchHomeRecords();
  const products = rawProducts.map(toProduct);

  const tiles: CategoryTile[] = collections.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    tagline: c.description,
    image: c.bannerImage ?? COLLECTION_BANNERS[c.slug] ?? null,
  }));

  // A product may only appear in ONE rail. Beyond the merchandising argument,
  // `<ProductCard>` names its view transition `product-<id>`, and two live
  // elements sharing a transition name silently disables View Transitions for
  // the whole page — so a duplicate across rails is a functional bug, not just
  // a repeat. Rails claim in priority order: New In, then featured, then
  // collections.
  const claimed = new Set<string>();
  const claim = (pool: Product[]) => {
    const out: Product[] = [];
    for (const p of pool) {
      if (out.length >= RAIL_SIZE) break;
      if (claimed.has(p.id)) continue;
      claimed.add(p.id);
      out.push(p);
    }
    return out;
  };

  // Merchandised "new" wins; without it the newest arrivals are the honest answer.
  const tagged = products.filter((p) => p.tags.includes("new"));
  const newIn = claim(tagged.length > 0 ? tagged : products);

  const featured = claim(products.filter((p) => p.isFeatured));

  // Rail order follows the collection sortOrder, so merchandisers keep control
  // of which two worlds get the space.
  const collectionRails = tiles
    .map((tile) => ({
      tile,
      products: claim(products.filter((p) => p.collection?.slug === tile.slug)),
    }))
    .filter((rail) => rail.products.length >= MIN_RAIL_PRODUCTS)
    .slice(0, MAX_COLLECTION_RAILS);

  return { tiles, newIn, featured, collectionRails };
}

function getFallbackData(): HomeData {
  // Same one-rail-per-product rule as the live path — a duplicated card would
  // break View Transitions here too.
  const seen = new Set<string>();
  const claim = (pool: Product[]) => {
    const out: Product[] = [];
    for (const p of pool) {
      if (out.length >= RAIL_SIZE) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  };

  const tagged = POC_PRODUCTS.filter((p) => p.tags.includes("new"));
  return {
    tiles: FALLBACK_TILES,
    newIn: claim(tagged.length > 0 ? tagged : POC_PRODUCTS),
    featured: claim(POC_PRODUCTS.filter((p) => p.isFeatured)),
    collectionRails: [],
  };
}

export default async function HomePage() {
  let data = getFallbackData();

  try {
    const live = await getHomeData();
    // An empty catalogue reads as a broken store, so the demo one stands in;
    // real collections still win the tile row even when no product is visible.
    if (live.newIn.length > 0 || live.featured.length > 0) data = live;
    else if (live.tiles.length > 0) data = { ...data, tiles: live.tiles };
  } catch {
    // DB not connected — the POC catalogue above renders instead of a 500.
  }

  return (
    <>
      <HeroSection
        headline="The House of Dstyle"
        subline="Indian Couture · Bridal · Festive · Pret"
      />

      <CategoryTiles
        tiles={data.tiles}
        eyebrow="Curated worlds"
        title="Shop by occasion"
        subtitle="One atelier, every occasion — start where the moment takes you."
        href="/collections"
        linkLabel="All collections"
        className="bg-brand-paper"
      />

      <ProductRail
        products={data.newIn}
        eyebrow="Just landed"
        title="New in"
        subtitle="The latest pieces off the embroidery frame."
        href="/collections?tags=new"
        className="bg-brand-paper pt-0"
      />

      <ProductRail
        products={data.featured}
        eyebrow="Curated for you"
        title="The Edit"
        subtitle="The pieces our atelier keeps reaching for this season."
        href="/collections"
        className="bg-brand-ivory"
      />

      {/* The one editorial break. Everything below it is product again. */}
      <BrandStory />

      {data.collectionRails.map((rail, i) => (
        <ProductRail
          key={rail.tile.id}
          products={rail.products}
          eyebrow="The collection"
          title={rail.tile.name}
          subtitle={rail.tile.tagline ?? undefined}
          href={`/collections/${rail.tile.slug}`}
          className={i % 2 === 0 ? "bg-brand-paper" : "bg-brand-ivory"}
        />
      ))}

      <StatementBand />
    </>
  );
}
