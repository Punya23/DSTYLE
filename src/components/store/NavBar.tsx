import { prisma } from "@/lib/prisma";
import { cached, TTL } from "@/lib/cache";
import { getStoreConfig } from "@/lib/settings";
import type { StoreConfig } from "@/lib/pricing";
import { COLLECTION_BANNERS } from "@/data/demo-assets";
import { formatPrice } from "@/lib/utils";
import { AnnouncementBar } from "./AnnouncementBar";
import { NavBarClient, type NavCollection } from "./NavBarClient";

/**
 * Site chrome — announcement bar + navigation.
 *
 * This is a Server Component so the mega-menu is built from the real collection
 * taxonomy and the announcement bar from the real store configuration, rather
 * than a hard-coded list that silently drifts from the database. Both reads are
 * cached (Redis, ten-minute and five-minute TTLs) and both degrade to a working
 * nav if the database is unreachable.
 */

/**
 * Deliberately the same query and cache key as `GET /api/collections`, so the
 * nav shares that entry instead of adding a second read of the same rows.
 */
async function getNavCollections(): Promise<NavCollection[]> {
  try {
    const rows = await cached("collections", "visible", TTL.collections, () =>
      prisma.collection.findMany({
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      })
    );

    return rows.map((c) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.bannerImage ?? COLLECTION_BANNERS[c.slug] ?? null,
      productCount: c._count.products,
    }));
  } catch {
    // No database — the nav still renders, just without the mega-menu.
    return [];
  }
}

/**
 * Offers, stated from configuration only.
 *
 * Every line here is a fact the checkout will honour: the free-shipping
 * threshold, the COD handling fee and the GST treatment all come from the same
 * `StoreConfig` the quote engine prices with. Nothing invents a code, a
 * percentage or a deadline.
 */
function offerMessages(config: StoreConfig): string[] {
  const messages: string[] = [];

  messages.push(
    config.freeShippingThreshold > 0
      ? `Complimentary shipping above ${formatPrice(config.freeShippingThreshold)}`
      : "Complimentary shipping on every order"
  );

  messages.push(
    config.codFee > 0
      ? `Cash on delivery — ${formatPrice(config.codFee)} handling fee`
      : "Cash on delivery available at no extra charge"
  );

  if (config.gstEnabled) {
    messages.push(
      config.pricesIncludeGst ? "All prices inclusive of GST" : "GST calculated at checkout"
    );
  }

  return messages;
}

export async function NavBar() {
  const [collections, config] = await Promise.all([getNavCollections(), getStoreConfig()]);

  return (
    <NavBarClient
      collections={collections}
      announcement={<AnnouncementBar messages={offerMessages(config)} />}
    />
  );
}
