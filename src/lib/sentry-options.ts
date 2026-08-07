import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Sentry options shared by the client, server and edge inits.
 *
 * Everything here is deliberately conservative about what leaves the process:
 * this is a storefront, so payloads routinely contain addresses, phone numbers
 * and order references.
 */

/**
 * The Vercel Sentry integration injects `SENTRY_DSN`; the public variable is
 * what the browser bundle can actually see. Accept either so the same code
 * works whether the DSN was provisioned or pasted in by hand.
 */
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

/**
 * No DSN means no Sentry — `init` is a no-op rather than an error, which keeps
 * local dev and any not-yet-provisioned environment quiet. Also off in
 * development, where every hot-reload error would otherwise be reported.
 */
export const SENTRY_ENABLED =
  Boolean(SENTRY_DSN) && process.env.NODE_ENV === "production";

export const sharedSentryOptions = {
  /**
   * 10% of transactions. Enough to spot a slow checkout without paying to trace
   * every catalogue browse.
   */
  tracesSampleRate: 0.1,

  /**
   * PII is opt-in, and stays off. Sentry would otherwise attach IP addresses and
   * request bodies — which on this app means delivery addresses and phone
   * numbers sitting in a third-party dashboard.
   */
  sendDefaultPii: false,

  /** Distinguishes preview deploys from production in the Sentry UI. */
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  /** Ties an error to the exact deploy it came from. */
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  /**
   * Last line of defence on secrets. Sentry redacts known-sensitive keys, but
   * this app has its own: Razorpay signatures and OTPs are not in that list.
   */
  beforeSend(event: ErrorEvent): ErrorEvent {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-razorpay-signature"];
    }
    if (event.request) delete event.request.cookies;
    return event;
  },
} as const;
