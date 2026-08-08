import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client, created lazily.
 *
 * The Vercel Marketplace integration injects the REST credentials under one of
 * two prefixes depending on when the store was provisioned (`UPSTASH_REDIS_*`
 * for a direct Upstash resource, `KV_*` for one carried over from the old
 * Vercel KV naming). Both are accepted so a re-provision never silently
 * disables caching.
 *
 * Returns `null` when nothing is configured — every caller must handle that and
 * degrade rather than throw. Local dev without a Redis store has to keep
 * working.
 */

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  // Guard against the scaffold placeholders in .env.example being copied across.
  if (!url || !token) return null;
  if (/placeholder|your[-_]|xxx|change[-_ ]?me|example/i.test(url)) return null;

  return { url, token };
}

let client: Redis | null = null;
let resolved = false;

export function redis(): Redis | null {
  if (resolved) return client;
  resolved = true;

  const creds = credentials();
  if (!creds) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[redis] No Upstash credentials found — rate limiting falls back to " +
          "per-instance memory and caching is disabled."
      );
    }
    return null;
  }

  client = new Redis(creds);
  return client;
}

export function redisConfigured(): boolean {
  return redis() !== null;
}
