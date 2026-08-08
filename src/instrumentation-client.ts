import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENABLED, sharedSentryOptions } from "@/lib/sentry-options";

/**
 * Browser-side Sentry. Runs before the app becomes interactive, so it catches
 * errors thrown during hydration — the ones most likely to leave a shopper
 * staring at a blank product page.
 */
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  ...sharedSentryOptions,

  /**
   * Session Replay is off. It records the DOM, which on the checkout route means
   * capturing a customer's address as they type it.
   */
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

/** Lets Sentry attribute client errors to the navigation that caused them. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
