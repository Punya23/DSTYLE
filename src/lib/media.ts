import { publicIdFor } from "@/lib/cloudinary-loader";

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("/video/upload/");
}

export function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url) || url.includes("cloudinary.com");
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

/** Kept in step with `MIGRATED_PREFIXES` in `src/lib/cloudinary-loader.ts`. */
const MIGRATED_PREFIXES = ["/products/", "/hero/", "/editorial/", "/lookbook/", "/collections/", "/brand/"];

/**
 * Cloudinary equivalent of the `next/image` loader, for `<video>` — which never
 * goes through `next/image` and so would otherwise stream the raw master file
 * out of the app origin on every play.
 *
 * The `.mp4` extension is not decoration. On a video delivery URL with no
 * extension, Cloudinary resolves `f_auto` against the request's `Accept`
 * header — and a `<video>` element's Accept is permissive enough that the same
 * URL can come back as an image.
 *
 * The transformation is the result of measuring, not of guessing:
 *
 *   untransformed              7,845,575 B
 *   q_auto,vc_auto             6,646,069 B   (-15%; `vc_auto` picks H.264 and
 *                                             keeps the source's 3.04 Mbps)
 *   + br_900k, w_720           2,670,191 B   (-66%)
 *
 * Both masters are 720x1280 portrait, so `w_720` is the real source width — an
 * earlier `w_1280` did nothing at all, since `c_limit` only ever scales down.
 * The bitrate cap is what actually moves the number, and 900 kbps at 720p is
 * well inside what a phone renders cleanly for a short silent reel.
 *
 * Same contract as the image loader: an unrecognised URL is returned untouched.
 */
export function videoUrl(url: string): string {
  if (!CLOUD_NAME) return url;
  if (url.startsWith("https://res.cloudinary.com/")) return url;
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (!MIGRATED_PREFIXES.some((p) => url.startsWith(p))) return url;

  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto:eco,vc_auto,w_720,c_limit,br_900k/${publicIdFor(url)}.mp4`;
}

/**
 * Poster frame for a reel, so the browser paints something during the first
 * bytes instead of a black rectangle. `so_0` is Cloudinary's "seek to 0s", and
 * requesting it as an image gets a still rather than a video segment.
 */
export function videoPosterUrl(url: string, explicitPoster?: string | null): string | undefined {
  if (explicitPoster) return explicitPoster;
  if (!CLOUD_NAME) return undefined;
  if (!MIGRATED_PREFIXES.some((p) => url.startsWith(p))) return undefined;

  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,f_auto,q_auto,w_800,c_limit/${publicIdFor(url)}.jpg`;
}
