import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE_CONFIG, type StoreConfig } from "@/lib/pricing";

/**
 * Store-wide tax and shipping configuration, held in a single row keyed
 * `"default"`. Reads fall back to the compiled-in defaults so the storefront
 * still prices correctly on a database that has never been seeded.
 */

const SETTINGS_ID = "default";

/** Read the config, creating the row on first use. */
export async function getStoreConfig(): Promise<StoreConfig> {
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
}

export async function updateStoreConfig(patch: Partial<StoreConfig>): Promise<StoreConfig> {
  await prisma.storeSetting.upsert({
    where: { id: SETTINGS_ID },
    update: patch,
    create: { id: SETTINGS_ID, ...patch },
  });
  return getStoreConfig();
}
