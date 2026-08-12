import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE_CONFIG, type StoreConfig } from "@/lib/pricing";

/**
 * Store-wide tax and shipping configuration, held in a single row keyed
 * `"default"`. Reads fall back to the compiled-in defaults so the storefront
 * still prices correctly on a database that has never been seeded.
 */

const SETTINGS_ID = "default";

/**
 * Read the config, creating the row on first use.
 *
 * Deliberately NOT behind the Redis cache, despite being read by nearly every
 * price calculation. This is called from Server Components (the announcement
 * bar in the root layout, the product page, checkout), and the Upstash client
 * fetches with `cache: "no-store"`, which opts the calling route out of static
 * rendering — from the root layout that meant every page in the site. See the
 * header comment in `src/lib/cache.ts`.
 *
 * Nothing is lost by dropping it. The pages that read this are prerendered on a
 * revalidation window, so the query runs once per window rather than once per
 * visitor; and for the route handlers that are dynamic anyway, an indexed
 * single-row read from Neon in-region is comfortably faster than a round trip
 * to Upstash's REST endpoint would have been.
 *
 * React's `cache()` still dedupes it within one render, which is the only
 * duplication that was ever actually happening.
 */
export const getStoreConfig = cache(async (): Promise<StoreConfig> => {
  try {
    const row =
      (await prisma.storeSetting.findUnique({ where: { id: SETTINGS_ID } })) ??
      (await prisma.storeSetting.create({ data: { id: SETTINGS_ID } }));

    return {
      gstEnabled: row.gstEnabled,
      pricesIncludeGst: row.pricesIncludeGst,
      gstLowRate: Number(row.gstLowRate),
      gstHighRate: Number(row.gstHighRate),
      gstSlabThreshold: Number(row.gstSlabThreshold),
      shippingFlat: Number(row.shippingFlat),
      freeShippingThreshold: Number(row.freeShippingThreshold),
      codFee: Number(row.codFee),
    };
  } catch {
    // Unseeded or unreachable database — pricing must still work.
    return DEFAULT_STORE_CONFIG;
  }
});

export async function updateStoreConfig(patch: Partial<StoreConfig>): Promise<StoreConfig> {
  await prisma.storeSetting.upsert({
    where: { id: SETTINGS_ID },
    update: patch,
    create: { id: SETTINGS_ID, ...patch },
  });
  // No cache to drop any more — `getStoreConfig` reads Postgres, and React's
  // `cache()` scope ends with this request. The storefront's prerendered copies
  // are refreshed by the `revalidatePath` calls in the settings route.
  return getStoreConfig();
}
