import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE_CONFIG, type StoreConfig } from "@/lib/pricing";
import { cached, invalidate, TTL } from "@/lib/cache";

/**
 * Store-wide tax and shipping configuration, held in a single row keyed
 * `"default"`. Reads fall back to the compiled-in defaults so the storefront
 * still prices correctly on a database that has never been seeded.
 */

const SETTINGS_ID = "default";

/**
 * Read the config, creating the row on first use.
 *
 * Cached because every price calculation — cart quote, product page, checkout —
 * reads this, while it changes only when the owner edits it in the admin panel.
 * The fallback path is deliberately outside the cache: a config that came from
 * `DEFAULT_STORE_CONFIG` because the database was briefly unreachable must not
 * be pinned for the next five minutes.
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  try {
    return await cached("settings", SETTINGS_ID, TTL.settings, async () => {
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
    });
  } catch {
    // Unseeded or unreachable database — pricing must still work.
    return DEFAULT_STORE_CONFIG;
  }
}

export async function updateStoreConfig(patch: Partial<StoreConfig>): Promise<StoreConfig> {
  await prisma.storeSetting.upsert({
    where: { id: SETTINGS_ID },
    update: patch,
    create: { id: SETTINGS_ID, ...patch },
  });
  // Drop the old config before re-reading, or `getStoreConfig` below serves the
  // pre-edit values straight back to the admin who just saved them.
  await invalidate("settings");
  return getStoreConfig();
}
