import * as Sentry from "@sentry/nextjs";

/**
 * Server-side observability boot. Runs once per server instance, before the
 * first request is handled.
 *
 * The two runtimes get separate configs because the edge runtime has no Node
 * APIs; importing the Node config there fails at build time.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Reports errors Next catches while rendering Server Components or running
 * route handlers — these never surface to a `try/catch` we control, so without
 * this hook they are invisible.
 */
export const onRequestError = Sentry.captureRequestError;
