"use client";

/**
 * `next/image` loader that delegates every transformation to Cloudinary.
 *
 * Wired up in `next.config.ts` as `images.loader: "custom"`. With a custom
 * loader Next's own `/_next/image` optimizer is bypassed entirely: no image
 * bytes pass through the app server, so a launch-day traffic spike costs the
 * origin nothing and the browser pulls straight from Cloudinary's CDN.
 *
 * The mapping from a site-relative path to a Cloudinary public id is a pure
 * function of the path, and the exact same function runs in
 * `scripts/cloudinary-migrate.mjs` when the asset is uploaded. Keeping it a
 * derivation rather than a lookup table is what lets `ProductImage.url` rows
 * stay as `/products/<slug>/01.jpg` — nothing in Postgres had to be rewritten,
 * and deleting the `loader`/`loaderFile` lines in `next.config.ts` reverts the
 * whole migration.
 *
 * Anything this loader does not recognise is returned untouched, so Google
 * avatars, `data:` URIs and the `public/uploads/` disk fallback all keep
 * working.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Matches the `FOLDER` constant in `scripts/cloudinary-migrate.mjs`. */
const FOLDER = "dstyle";

/**
 * Paths under `public/` that the migration script uploads. A path outside this
 * set (notably `/uploads/`, the local-disk admin fallback) is served
 * same-origin, unchanged.
 */
const MIGRATED_PREFIXES = ["/products/", "/hero/", "/editorial/", "/lookbook/", "/collections/", "/brand/"];

/**
 * `/products/tassel-work-lehenga/01.jpg` -> `dstyle/products/tassel-work-lehenga/01`
 *
 * Must stay byte-identical to `publicIdFor()` in the migration script.
 */
export function publicIdFor(sitePath: string): string {
  const withoutExt = sitePath.replace(/\.[^./]+$/, "");
  return `${FOLDER}/${withoutExt.replace(/^\/+/, "")}`;
}

/**
 * `c_limit` rather than `c_fill`: these are couture photographs where the
 * garment runs to the edge of the frame, so a crop is a defect, not a
 * thumbnail. `c_limit` only ever scales down, and never past the source size.
 *
 * `f_auto` picks AVIF/WebP per browser. `q_auto:eco` rather than the default
 * `q_auto` (which is `q_auto:good`) because bandwidth is the binding constraint
 * on this storefront, and this is now the ONLY lossy pass an image takes —
 * `scripts/cloudinary-migrate.mjs` deliberately stores the masters untouched,
 * so eco-on-an-original is visibly better than good-on-an-already-recompressed
 * copy, which is what the first migration was doing.
 *
 * Measured at w_1080:
 *
 *   q_auto:good   brand/story 166,608 B   zardozi-lehenga/01 89,602 B
 *   q_auto:eco    brand/story 121,977 B   zardozi-lehenga/01 79,814 B
 *
 * If a photograph ever looks soft on the embroidery, raise this to `q_auto`
 * here rather than re-encoding on upload.
 */
function transform(width: number, quality?: number): string {
  return ["f_auto", quality ? `q_${quality}` : "q_auto:eco", "c_limit", `w_${width}`].join(",");
}

interface LoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

export default function cloudinaryLoader({ src, width, quality }: LoaderArgs): string {
  // No cloud configured (a fresh clone, or CI): fall back to the raw path so
  // pages still render rather than pointing at `res.cloudinary.com/undefined`.
  if (!CLOUD_NAME) return src;

  // Already a Cloudinary URL — an admin upload, which is stored absolute.
  // Insert the transformation segment after `/upload/` so those images get the
  // same responsive treatment as the migrated ones. A URL that already carries
  // a transformation is left alone rather than double-transformed.
  if (src.startsWith("https://res.cloudinary.com/")) {
    const marker = "/upload/";
    const at = src.indexOf(marker);
    if (at === -1) return src;
    const rest = src.slice(at + marker.length);
    // A version segment (`v1234567/`) or a bare public id means untransformed.
    const alreadyTransformed = /^[a-z]{1,3}_[^/]+\//.test(rest) && !/^v\d+\//.test(rest);
    if (alreadyTransformed) return src;
    return `${src.slice(0, at + marker.length)}${transform(width, quality)}/${rest}`;
  }

  // Any other absolute URL (Google avatars) or inline data — untouched.
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  if (!MIGRATED_PREFIXES.some((p) => src.startsWith(p))) return src;

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform(width, quality)}/${publicIdFor(src)}`;
}
