import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Deliberately NOT nonce-based. A nonce has to be minted per request, which
 * forces every page into dynamic rendering and disables static generation, ISR
 * and PPR — unacceptable for a storefront whose product and collection pages are
 * the thing that has to be fast. So `script-src` keeps 'unsafe-inline' (Next's
 * own bootstrap and our JSON-LD blocks are inline) and the hardening comes from
 * the directives that actually stop the attacks we care about: `object-src`,
 * `base-uri`, `form-action` and `frame-ancestors`.
 *
 * Every allowed host below is one the app genuinely talks to — keep this list
 * and the one in `images.remotePatterns` in sync when a new host is added.
 */
const csp = [
  `default-src 'self'`,
  // Razorpay's checkout widget is loaded from their CDN; Vercel Analytics from theirs.
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://va.vercel-scripts.com${
    isDev ? " 'unsafe-eval'" : ""
  }`,
  // Tailwind + framer-motion write inline styles at runtime.
  `style-src 'self' 'unsafe-inline'`,
  // next/font self-hosts Google fonts at build time, so no external font host.
  `font-src 'self' data:`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com`,
  // Product reels are served from Cloudinary.
  `media-src 'self' blob: https://res.cloudinary.com`,
  // Razorpay telemetry + Sentry ingest + Vercel Analytics beacons. In dev the
  // websocket entries are what keep hot reload alive.
  `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://va.vercel-scripts.com https://vitals.vercel-insights.com${
    isDev ? " ws: wss:" : ""
  }`,
  // Razorpay renders its payment sheet in an iframe.
  `frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt-and-braces with frame-ancestors, for browsers that predate CSP level 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in the storefront needs these; denying them shrinks the attack surface.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,
  images: {
    /**
     * Every image is transformed and served by Cloudinary, not by Next's
     * `/_next/image` optimizer. See `src/lib/cloudinary-loader.ts` for the
     * mapping and `scripts/cloudinary-migrate.mjs` for the upload side.
     *
     * The point is that no image byte ever passes through the app server: on a
     * launch-day spike the origin serves HTML and nothing else, and image
     * delivery scales on a CDN that is already built for it. It also removes
     * the per-transformation cost of Vercel's optimizer.
     *
     * Reverting is deleting these two lines — `ProductImage.url` rows are still
     * plain site-relative paths, so the built-in optimizer picks them straight
     * back up.
     */
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",
    /**
     * Unused while `loader` is "custom" (Next does no optimization of its own),
     * kept so that reverting the two lines above restores the previous
     * behaviour exactly rather than silently dropping AVIF and the host
     * allowlist.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    viewTransition: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  /**
   * `?collection=` was the old facet URL for the browser at `/collections`.
   * It used to be collapsed inside the page component, which meant reading
   * `searchParams` — and that alone forced the whole route to render per
   * request. Handled here it costs nothing: the platform answers with a 308
   * before any of the app runs.
   *
   * `collection=all` is deliberately not matched; that is the unfiltered
   * browser and already lives at `/collections`.
   */
  async redirects() {
    return [
      {
        source: "/collections",
        has: [{ type: "query", key: "collection", value: "(?<col>(?!all$)[^&]+)" }],
        destination: "/collections/:col",
        permanent: true,
      },
    ];
  },
};

/**
 * Source-map upload only happens when Sentry is actually provisioned. Wrapping
 * unconditionally makes every local `next build` print credential warnings for a
 * service that isn't configured.
 */
const sentryReady = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN
);

export default sentryReady
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Upload maps so stack traces are readable, then delete them from the
      // bundle — shipping them would hand the whole source to any visitor.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
      silent: !process.env.CI,
      // Strips Sentry's own debug logging from the client bundle.
      disableLogger: true,
      // Reports Vercel cron failures as Sentry issues.
      automaticVercelMonitors: true,
    })
  : nextConfig;
