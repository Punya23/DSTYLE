import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPocProductBySlug, getRelatedPocProducts } from "@/lib/poc-products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions, ProductMobileBar } from "@/components/product/ProductActions";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import type { ProductImage, SKU, Product } from "@/types";

function serializeSkus(skus: Array<{ price: unknown } & Record<string, unknown>>): SKU[] {
  return skus.map((s) => ({ ...s, price: Number(s.price) })) as SKU[];
}

function serializeProducts(
  products: Array<{ basePrice: unknown; skus: Array<{ price: unknown } & Record<string, unknown>>; [key: string]: unknown }>
): Product[] {
  return products.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
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
      skus: true,
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
      skus: true,
      collection: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const poc = getPocProductBySlug(slug);
  if (poc) {
    return { title: poc.name, description: poc.description.slice(0, 155) };
  }
  try {
    const product = await getProductFromDb(slug);
    if (!product) return {};
    return { title: product.name, description: product.description.slice(0, 155) };
  } catch {
    return {};
  }
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
  const primaryImage = images.find((i) => i.isPrimary) ?? images[0];
  const collectionSlug = product.collection?.slug;

  return (
    <div className="pt-[64px] sm:pt-[72px] pb-24 md:pb-16 bg-brand-ivory">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-12 py-3.5 sm:py-4 overflow-x-auto hide-scrollbar">
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
      </div>

      <div className="px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-10 md:py-12 lg:py-16">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 xl:gap-24">
          <ProductGallery images={images} productName={product.name} transitionName={`product-${product.id}`} />

          <div className="min-w-0 md:sticky md:top-[92px] lg:top-[104px] md:self-start space-y-6 md:space-y-8">
            <div>
              {product.collection && (
                <Link
                  href={`/collections?collection=${collectionSlug}`}
                  className="group inline-flex items-center gap-3 text-[10px] sm:text-[11px] font-sans tracking-luxe uppercase text-brand-gold hover:text-brand-gold-deep transition-colors duration-300"
                >
                  <span className="h-px w-7 gold-rule-solid opacity-70 transition-all duration-500 group-hover:w-10" />
                  {product.collection.name}
                </Link>
              )}
              <h1 className="font-display italic text-brand-ink text-balance text-[2rem] sm:text-4xl md:text-[2.6rem] lg:text-5xl leading-[1.05] mt-3.5">
                {product.name}
              </h1>
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
              />
            </div>

            <div className="space-y-3.5 pt-7 border-t border-brand-ivory-deep">
              <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold">The Piece</p>
              <p className="font-sans text-[13px] sm:text-[14px] text-[#6b6560] leading-[1.85]">
                {product.description}
              </p>
            </div>

            <div className="space-y-0 border-t border-brand-ivory-deep">
              {product.material && (
                <details className="group border-b border-brand-ivory-deep">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink min-h-[48px] transition-colors duration-300 hover:text-brand-gold">
                    Material
                    <span className="text-brand-gold group-open:rotate-45 transition-transform duration-300 text-lg leading-none">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[13px] font-sans text-[#6b6560] leading-[1.85]">
                    {product.material}
                  </p>
                </details>
              )}
              {product.careInstr && (
                <details className="group border-b border-brand-ivory-deep">
                  <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink min-h-[48px] transition-colors duration-300 hover:text-brand-gold">
                    Care Instructions
                    <span className="text-brand-gold group-open:rotate-45 transition-transform duration-300 text-lg leading-none">
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-[13px] font-sans text-[#6b6560] leading-[1.85]">
                    {product.careInstr}
                  </p>
                </details>
              )}
              <details className="group border-b border-brand-ivory-deep">
                <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-[11px] font-sans font-medium tracking-luxe uppercase text-brand-ink min-h-[48px] transition-colors duration-300 hover:text-brand-gold">
                  Shipping &amp; Returns
                  <span className="text-brand-gold group-open:rotate-45 transition-transform duration-300 text-lg leading-none">
                    +
                  </span>
                </summary>
                <div className="pb-5 text-[13px] font-sans text-[#6b6560] leading-[1.85] space-y-2">
                  <p>Complimentary standard shipping on orders above ₹5,000.</p>
                  <p>Express delivery available at checkout.</p>
                  <p>Returns accepted within 7 days of delivery.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && <FeaturedProducts products={related} compact />}

      <ProductMobileBar
        productId={product.id}
        productName={product.name}
        productSlug={product.slug}
        primaryImage={primaryImage}
        skus={serializedSkus}
        isActive={isActive}
      />
    </div>
  );
}
