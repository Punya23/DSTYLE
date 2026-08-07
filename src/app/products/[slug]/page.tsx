import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPocProductBySlug, getRelatedPocProducts } from "@/lib/poc-products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions, ProductMobileBar } from "@/components/product/ProductActions";
import { ProductTrust } from "@/components/product/ProductTrust";
import { ProductOffers, type StoreOffer } from "@/components/product/ProductOffers";
import {
  ProductTabs,
  type TabReview,
  type TabSize,
  type TabSpec,
} from "@/components/product/ProductTabs";
import { ProductRail } from "@/components/store/ProductRail";
import { TrackProductView, RecentlyViewedStrip } from "@/components/store/RecentlyViewed";
import { JsonLd } from "@/components/JsonLd";
import { RETURN_WINDOW_DAYS } from "@/lib/account";
import { fromPrice } from "@/lib/inventory";
import { discountPercent } from "@/lib/pricing";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { getStoreConfig } from "@/lib/settings";
import { productSchema, breadcrumbSchema } from "@/lib/structured-data";
import { formatPrice } from "@/lib/utils";
import type { ProductImage, ProductVideo, SKU, Product } from "@/types";

/** `null` stays `null`; a Prisma `Decimal` becomes a plain number. */
function toMoney(v: unknown): number | null {
  return v == null ? null : Number(v);
}

function serializeSkus(skus: Array<{ price: unknown } & Record<string, unknown>>): SKU[] {
  return skus.map((s) => ({ ...s, price: Number(s.price), mrp: toMoney(s.mrp) })) as SKU[];
}

function serializeProducts(
  products: Array<{ basePrice: unknown; skus: Array<{ price: unknown } & Record<string, unknown>>; [key: string]: unknown }>
): Product[] {
  return products.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    mrp: toMoney(p.mrp),
    skus: serializeSkus(p.skus),
  })) as unknown as Product[];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProductFromDb(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isVisible: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      skus: { orderBy: [{ sortOrder: "asc" }, { size: "asc" }] },
      collection: { select: { id: true, name: true, slug: true } },
    },
  });
}

async function getRelatedFromDb(productId: string, collectionId: string | null) {
  return prisma.product.findMany({
    where: {
      isVisible: true,
      NOT: { id: productId },
      ...(collectionId ? { collectionId } : {}),
    },
    take: 4,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      skus: { orderBy: [{ sortOrder: "asc" }, { size: "asc" }] },
      collection: { select: { id: true, name: true, slug: true } },
    },
  });
}

/**
 * Rating summary for the product page. Feeds both the JSON-LD block and the
 * Reviews tab, so the star average a shopper reads and the one Google reads are
 * the same aggregate. Absent when the piece has no reviews.
 */
async function getRatingSummary(productId: string) {
  try {
    const [agg, latest] = await Promise.all([
      prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    if (agg._count.rating === 0 || agg._avg.rating === null) return null;
    return {
      rating: { average: agg._avg.rating, count: agg._count.rating },
      reviews: latest.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        author: r.user.name ?? "Verified buyer",
      })),
    };
  } catch {
    return null;
  }
}

/** One fixed locale, resolved on the server, so no date is re-formatted client-side. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

/**
 * Coupons a shopper could actually redeem against this piece right now:
 * switched on, inside their window, not fully redeemed, and either unscoped or
 * scoped to this product or its collection. Every field of the rendered offer
 * is a column on the row — nothing is composed here, so a store with no live
 * coupons shows no offers block at all.
 */
async function getLiveOffers(
  productId: string,
  collectionId: string | null
): Promise<StoreOffer[]> {
  try {
    const now = new Date();
    const rows = await prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          {
            OR: [
              { AND: [{ productIds: { isEmpty: true } }, { collectionIds: { isEmpty: true } }] },
              { productIds: { has: productId } },
              ...(collectionId ? [{ collectionIds: { has: collectionId } }] : []),
            ],
          },
        ],
      },
      // Soonest to expire first, so a code about to lapse is the one on screen.
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        value: true,
        maxDiscount: true,
        minOrder: true,
        buyQty: true,
        getQty: true,
        expiresAt: true,
        usageLimit: true,
        usageCount: true,
        firstOrderOnly: true,
      },
    });

    return rows
      // A fully redeemed code is dead; Prisma can't compare two columns in the
      // filter, so the cap is applied here.
      .filter((c) => c.usageLimit == null || c.usageCount < c.usageLimit)
      .slice(0, 3)
      .map((c) => {
        // Mirrors `describe()` in lib/coupons.ts — the label a shopper sees at
        // checkout when the same code is applied.
        const value = Number(c.value);
        let label: string;
        switch (c.type) {
          case "PERCENT":
            label = `${value}% off`;
            break;
          case "FIXED":
            label = `${formatPrice(value)} off`;
            break;
          case "FREE_SHIPPING":
            label = "Free shipping";
            break;
          case "BUY_X_GET_Y":
            label = `Buy ${c.buyQty ?? 0} get ${c.getQty ?? 0} free`;
            break;
          default:
            label = "Discount applied";
        }

        const terms: string[] = [];
        if (c.minOrder != null) terms.push(`Minimum order ${formatPrice(Number(c.minOrder))}`);
        if (c.type === "PERCENT" && c.maxDiscount != null) {
          terms.push(`Up to ${formatPrice(Number(c.maxDiscount))}`);
        }
        if (c.firstOrderOnly) terms.push("First order only");
        if (c.expiresAt) terms.push(`Ends ${DATE_FORMAT.format(c.expiresAt)}`);

        return { id: c.id, code: c.code, label, description: c.description, terms };
      });
  } catch {
    // No database (the POC catalogue path) — there are no live coupons to show.
    return [];
  }
}

/** Product photos are absolute Cloudinary URLs; POC fixtures are site-relative. */
function toAbsoluteImage(url: string): string {
  return /^https?:\/\//.test(url) ? url : absoluteUrl(url);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  let product: { name: string; description: string; images: { url: string; altText: string | null }[] } | null =
    null;

  try {
    product = await getProductFromDb(slug);
  } catch {
    // DB unavailable — fall through to the POC catalogue below.
  }
  if (!product) product = getPocProductBySlug(slug) ?? null;

  // Unknown slug: the page itself will 404, so emit nothing rather than a
  // half-built card for a URL that doesn't exist.
  if (!product) return {};

  return pageMetadata({
    title: product.name,
    description: product.description,
    path: `/products/${slug}`,
    // Up to four images — enough for a rich card without bloating the head.
    images: product.images.slice(0, 4).map((i) => ({
      url: toAbsoluteImage(i.url),
      alt: i.altText ?? product.name,
    })),
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof getProductFromDb>> | ReturnType<typeof getPocProductBySlug> = null;
  let related: Product[] = [];
  let isActive = true;
  let fromPoc = false;

  try {
    product = await getProductFromDb(slug);
    if (product) {
      const rawRelated = await getRelatedFromDb(product.id, product.collectionId);
      related = serializeProducts(rawRelated);
      isActive = true;
    }
  } catch {
    // fall through to POC
  }

  if (!product) {
    const poc = getPocProductBySlug(slug);
    if (!poc) notFound();
    product = poc;
    related = getRelatedPocProducts(slug);
    isActive = poc.isActive;
    fromPoc = true;
  }

  if (!product) notFound();

  const serializedSkus: SKU[] = fromPoc
    ? (product.skus as SKU[])
    : serializeSkus(product.skus as Array<{ price: unknown } & Record<string, unknown>>);
  const images = product.images as ProductImage[];
  // POC fixtures predate product video, so the field is simply absent there.
  const videos = ((product as { videos?: ProductVideo[] }).videos ?? []) as ProductVideo[];
  const primaryImage = images.find((i) => i.isPrimary) ?? images[0];
  const collectionSlug = product.collection?.slug;

  // Garment attributes, rendered as one spec list — only what's filled in.
  const specs = (
    [
      ["Fabric", (product as { fabric?: string | null }).fabric] as [string, string | null | undefined],
      ["Material", product.material],
      ["Sleeve", (product as { sleeve?: string | null }).sleeve],
      ["Neck", (product as { neck?: string | null }).neck],
      ["Length", (product as { length?: string | null }).length],
      [
        "Colour",
        Array.from(new Set(serializedSkus.map((s) => s.color).filter(Boolean))).join(", "),
      ],
      ["Sizes", Array.from(new Set(serializedSkus.map((s) => s.size))).join(" · ")],
      ["Delivery", (product as { deliveryTime?: string | null }).deliveryTime],
    ]
  ).filter((row): row is [string, string] => Boolean(row[1]));

  // Ratings, coupons and store config only exist for real catalogue rows; the
  // POC catalogue runs with no database at all.
  const [ratings, offers, storeConfig] = await Promise.all([
    fromPoc ? Promise.resolve(null) : getRatingSummary(product.id),
    fromPoc
      ? Promise.resolve<StoreOffer[]>([])
      : getLiveOffers(product.id, (product as { collectionId?: string | null }).collectionId ?? null),
    getStoreConfig(),
  ]);

  // Price row. `mrp` is a Prisma Decimal on the database path and a plain
  // number on the POC path, so it goes through the same money serialiser as
  // every other amount on this page.
  const price = fromPrice(serializedSkus);
  const mrp = toMoney((product as { mrp?: unknown }).mrp);
  const savedPercent = discountPercent(price, mrp);
  const hasPriceRange = new Set(serializedSkus.map((s) => s.price)).size > 1;

  // "Inclusive of all taxes" is only true when GST is switched on, the piece
  // isn't exempt, and its price already contains the tax.
  const taxRow = product as { priceIncludesGst?: boolean; gstExempt?: boolean };
  const taxInclusive =
    storeConfig.gstEnabled &&
    !taxRow.gstExempt &&
    (taxRow.priceIncludesGst ?? storeConfig.pricesIncludeGst);

  const tabSpecs: TabSpec[] = specs.map(([label, value]) => ({ label, value }));

  // One entry per size the piece is cut in; "in stock" is derived from the SKU
  // count, exactly as the size chips derive it.
  const tabSizes: TabSize[] = Array.from(
    serializedSkus
      .reduce((acc, sku) => {
        const previous = acc.get(sku.size);
        acc.set(sku.size, {
          size: sku.size,
          inStock: (previous?.inStock ?? false) || ((sku.isActive ?? true) && sku.stock > 0),
        });
        return acc;
      }, new Map<string, TabSize>())
      .values()
  );

  const tabReviews: TabReview[] = (ratings?.reviews ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    date: DATE_FORMAT.format(r.createdAt),
    author: r.author,
  }));

  const jsonLd = [
    productSchema({
      name: product.name,
      slug: product.slug,
      description: product.description,
      material: product.material,
      images: images.map((i) => ({ url: toAbsoluteImage(i.url) })),
      collectionName: product.collection?.name ?? null,
      skus: serializedSkus.map((s) => ({
        skuCode: s.skuCode,
        size: s.size,
        color: s.color,
        price: s.price,
        stock: s.stock,
      })),
      basePrice: Number(product.basePrice),
      rating: ratings?.rating ?? null,
      reviews: ratings?.reviews,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Collections", path: "/collections" },
      ...(product.collection
        ? [{ name: product.collection.name, path: `/collections/${product.collection.slug}` }]
        : []),
      { name: product.name, path: `/products/${product.slug}` },
    ]),
  ];

  return (
    // The floor clears the sticky mobile buy bar *and* the iOS home indicator
    // underneath it, so the last strip is never trapped behind the bar.
    <div className="pt-[64px] sm:pt-[72px] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-16 bg-brand-ivory">
      <JsonLd data={jsonLd} />
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="px-4 sm:px-6 lg:px-12 py-3.5 sm:py-4 overflow-x-auto hide-scrollbar"
      >
        <div className="w-full flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px] font-sans tracking-wide text-[#888] whitespace-nowrap">
          <Link href="/" transitionTypes={["nav-back"]} className="hover:text-brand-gold transition-colors duration-300">
            Home
          </Link>
          <span className="text-brand-champagne">/</span>
          <Link href="/collections" transitionTypes={["nav-back"]} className="hover:text-brand-gold transition-colors duration-300">
            Collections
          </Link>
          {product.collection && (
            <>
              <span className="text-brand-champagne">/</span>
              <Link
                href={`/collections?collection=${collectionSlug}`}
                className="hover:text-brand-gold transition-colors duration-300 capitalize"
              >
                {product.collection.name}
              </Link>
            </>
          )}
          <span className="text-brand-champagne">/</span>
          <span className="text-brand-ink truncate max-w-[140px] sm:max-w-none">{product.name}</span>
        </div>
      </nav>

      <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-10 md:py-12 lg:py-16">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 xl:gap-24">
          <ProductGallery
            images={images}
            videos={videos}
            productName={product.name}
            transitionName={`product-${product.id}`}
          />

          <div className="min-w-0 md:sticky md:top-[92px] lg:top-[104px] md:self-start space-y-6 md:space-y-8">
            <div>
              {product.collection && (
                <Link
                  href={`/collections?collection=${collectionSlug}`}
                  className="group inline-flex min-h-11 sm:min-h-0 items-center gap-3 text-[10px] sm:text-[11px] font-sans tracking-luxe uppercase text-brand-gold hover:text-brand-gold-deep transition-colors duration-300"
                >
                  <span className="h-px w-7 gold-rule-solid opacity-70 transition-all duration-500 group-hover:w-10" />
                  {product.collection.name}
                </Link>
              )}
              {/* Upright, never italic — italic is the hero's, not commerce's. */}
              <h1 className="display-2 not-italic text-brand-ink text-balance mt-3.5">
                {product.name}
              </h1>

              {/* Wraps rather than overflows: at 320px the price, its compare-at
                  and the saving chip do not fit on one line. */}
              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="font-display text-[1.75rem] sm:text-[2rem] leading-none text-brand-ink tabular-nums">
                  {formatPrice(price)}
                </span>
                {savedPercent != null && mrp != null && (
                  <>
                    <span className="price-was font-sans text-[13px] sm:text-sm tabular-nums">
                      {formatPrice(mrp)}
                    </span>
                    <span className="badge badge-sale">{savedPercent}% OFF</span>
                  </>
                )}
                {hasPriceRange && (
                  <span className="font-sans text-[12px] text-brand-grey-dark">onwards</span>
                )}
              </div>
              {taxInclusive && (
                <p className="mt-2 font-sans text-[11px] text-brand-grey-dark">
                  Inclusive of all taxes
                </p>
              )}
            </div>

            {/* Laptop / desktop purchase panel */}
            <div className="hidden md:block">
              <ProductActions
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
                primaryImage={primaryImage}
                skus={serializedSkus}
                isActive={isActive}
                deliveryTime={(product as { deliveryTime?: string | null }).deliveryTime}
                mrp={mrp}
                freeShippingThreshold={storeConfig.freeShippingThreshold}
              />
            </div>

            <ProductTrust
              price={price}
              fabric={(product as { fabric?: string | null }).fabric ?? product.material}
              deliveryTime={(product as { deliveryTime?: string | null }).deliveryTime}
              freeShippingThreshold={storeConfig.freeShippingThreshold}
              codFee={storeConfig.codFee}
              className="pt-2"
            />

            {/* Renders nothing at all when no coupon is live for this piece. */}
            <ProductOffers offers={offers} />

            <ProductTabs
              description={product.description}
              specs={tabSpecs}
              fabric={(product as { fabric?: string | null }).fabric}
              material={product.material}
              careInstr={product.careInstr}
              lengthNote={(product as { length?: string | null }).length}
              sizes={tabSizes}
              deliveryTime={(product as { deliveryTime?: string | null }).deliveryTime}
              shippingFlat={storeConfig.shippingFlat}
              freeShippingThreshold={storeConfig.freeShippingThreshold}
              codFee={storeConfig.codFee}
              returnWindowDays={RETURN_WINDOW_DAYS}
              rating={ratings?.rating ?? null}
              reviews={tabReviews}
            />
          </div>
        </div>
      </div>

      {/* Renders nothing when there is nothing related to show. */}
      <ProductRail
        products={related}
        eyebrow="Keep looking"
        title="You may also like"
        className="bg-brand-paper"
      />

      <TrackProductView productId={product.id} />
      <RecentlyViewedStrip
        excludeId={product.id}
        className="px-4 sm:px-6 md:px-8 lg:px-12 py-14"
      />

      <ProductMobileBar
        productId={product.id}
        productName={product.name}
        productSlug={product.slug}
        primaryImage={primaryImage}
        skus={serializedSkus}
        isActive={isActive}
        deliveryTime={(product as { deliveryTime?: string | null }).deliveryTime}
        mrp={mrp}
        freeShippingThreshold={storeConfig.freeShippingThreshold}
      />
    </div>
  );
}
