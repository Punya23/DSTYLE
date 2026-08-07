import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, sharedSentryOptions } from "@/lib/sentry-options";

/**
 * Sentry for the Node.js runtime — API routes, Server Components, Server Actions.
 * Loaded from `instrumentation.ts` on server boot.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  ...sharedSentryOptions,
});
