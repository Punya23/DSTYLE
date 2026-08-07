import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, sharedSentryOptions } from "@/lib/sentry-options";

/**
 * Sentry for the edge runtime — `proxy.ts` and anything else Next runs there.
 * Kept separate from the server config because the edge runtime has no Node
 * APIs, so the two can't share an integration list.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  ...sharedSentryOptions,
});
