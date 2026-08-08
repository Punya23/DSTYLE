import { redis } from "@/lib/redis";

/**
 * Read-through cache over Redis for data that is read constantly and written
 * rarely: the collection list, catalogue pages, store settings.
 *
 * This sits *below* Next.js's own caching rather than replacing it. Next's cache
 * is per-deployment and per-region; this one is shared, so a settings change
 * made in the admin panel can be invalidated everywhere at once instead of
 * waiting out a revalidation window in each region.
 *
 * With no Redis configured every call degrades to invoking `fn` directly, so
 * nothing here is load-bearing for correctness.
 */

const PREFIX = "dstyle:cache";

/** TTLs in seconds. Deliberately short — invalidation is best-effort, not exact. */
export const TTL = {
  /** Collections change on the order of weeks. */
  collections: 600,
  /** Catalogue pages change whenever the admin edits a product. */
  products: 120,
  /** Store settings: read on nearly every request, written by one person. */
  settings: 300,
} as const;

/** Namespaces, so a targeted invalidation doesn't have to know every key. */
export type CacheNamespace = "collections" | "products" | "settings";

function fullKey(namespace: CacheNamespace, key: string): string {
  return `${PREFIX}:${namespace}:${key}`;
}

/**
 * Return the cached value for `key`, or compute it with `fn`, store it, and
 * return that.
 *
 * A Redis failure is logged and swallowed: a cache that is down must degrade to
 * a slower request, never a failed one.
 */
export async function cached<T>(
  namespace: CacheNamespace,
  key: string,
  ttlSec: number,
  fn: () => Promise<T>
): Promise<T> {
  const client = redis();
  if (!client) return fn();

  const k = fullKey(namespace, key);

  try {
    const hit = await client.get<T>(k);
    // `null` is ambiguous — it means both "missing" and "cached null" — so null
    // results are simply never served from cache. None of the callers cache one.
    if (hit !== null && hit !== undefined) return hit;
  } catch (err) {
    console.error(`[cache] read failed for ${k}:`, err);
    return fn();
  }

  const value = await fn();

  try {
    await client.set(k, value, { ex: ttlSec });
  } catch (err) {
    // The caller already has its answer; a failed write only costs a future miss.
    console.error(`[cache] write failed for ${k}:`, err);
  }

  return value;
}

/**
 * Drop every key in a namespace. Call after an admin write so the storefront
 * doesn't serve the old catalogue for the rest of the TTL.
 *
 * Uses SCAN rather than KEYS — KEYS blocks the Redis server for the duration of
 * the scan, which on a shared serverless instance affects every other caller.
 */
export async function invalidate(namespace: CacheNamespace): Promise<void> {
  const client = redis();
  if (!client) return;

  const pattern = `${PREFIX}:${namespace}:*`;

  try {
    let cursor = "0";
    do {
      const [next, keys] = await client.scan(cursor, { match: pattern, count: 200 });
      cursor = String(next);
      if (keys.length) await client.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    // Stale-until-TTL is an acceptable failure mode; a thrown error inside an
    // admin save is not.
    console.error(`[cache] invalidate failed for ${pattern}:`, err);
  }
}
