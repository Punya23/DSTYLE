import { AtelierSection } from "@/components/store/AtelierSection";
import { BrandStory } from "@/components/store/BrandStory";
import { CollectionsStrip } from "@/components/store/CollectionsStrip";
import { CampaignCarousel } from "@/components/store/CampaignCarousel";
import { ExperienceStrip } from "@/components/store/ExperienceStrip";
import { JournalSection } from "@/components/store/JournalSection";
import { StatementBand } from "@/components/store/StatementBand";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { HeroSection } from "@/components/store/HeroSection";
import { ScrollShowcase } from "@/components/store/ScrollShowcase";
import { MarqueeGallery } from "@/components/store/MarqueeGallery";
import { POC_PRODUCTS } from "@/data/poc-products";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";

// Re-generate the homepage at most once a minute so newly-featured products
// (added via the admin panel) appear without a redeploy, while staying fast.
export const revalidate = 60;

async function getFeaturedProducts(): Promise<Product[]> {
  const raw = await prisma.product.findMany({
    where: { isVisible: true, isFeatured: true },
    take: 6,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      skus: true,
      collection: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return raw.map((p) => ({
    ...p,
    basePrice: Number(p.basePrice),
    skus: p.skus.map((s) => ({ ...s, price: Number(s.price) })),
  }));
}

export default async function HomePage() {
  let products: Product[] = POC_PRODUCTS;

  try {
    const dbProducts = await getFeaturedProducts();
    if (dbProducts.length > 0) products = dbProducts;
  } catch {
    // DB not connected — show POC demo catalogue
  }

  return (
    <>
      <HeroSection
        videoUrl="/hero/hero.mp4"
        headline="The House of Dstyle"
        subline="Indian Couture · Bridal · Festive · Pret"
      />

      {/* Sections flow full-bleed on the ivory canvas — each owns its rhythm */}
      <CollectionsStrip />
      <FeaturedProducts products={products} compact />
      <BrandStory />
      <CampaignCarousel />
      <AtelierSection />
      <ScrollShowcase />
      <MarqueeGallery />
      <ExperienceStrip />
      <JournalSection />
      <StatementBand />
    </>
  );
}
