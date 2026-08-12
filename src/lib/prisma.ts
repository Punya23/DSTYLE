import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Postgres connection pool, sized for a serverless host.
 *
 * The defaults were the single worst capacity problem this app had. `pg` pools
 * at `max: 10` and, critically, waits **forever** for a free slot: under load
 * every request past the tenth simply hangs. A pre-launch load test showed
 * exactly that — at 150 concurrent connections the catalogue routes returned
 * zero responses in eight seconds rather than returning errors.
 *
 * The numbers below are chosen against the deployment shape, which is Vercel
 * Fluid Compute talking to Neon's *pooled* endpoint (`-pooler` in the host):
 *
 * - `max: 20` — each instance serves many concurrent requests, and a catalogue
 *   render issues several queries. Neon's pooler multiplexes thousands of client
 *   connections onto a small number of Postgres backends, so a slightly larger
 *   per-instance pool costs the database nothing. Going much higher is pointless:
 *   the bottleneck becomes Postgres backend processes, not client slots.
 *
 * - `connectionTimeoutMillis: 10_000` — the important one. Failing fast turns a
 *   saturated pool into a handful of 500s that the error boundary can render,
 *   instead of a pile of requests that hold a function open (and billable) until
 *   the platform's 300s ceiling.
 *
 * - `idleTimeoutMillis: 30_000` — an instance that goes quiet between spikes
 *   hands its connections back rather than sitting on them.
 *
 * - `statement_timeout` / `idle_in_transaction_session_timeout` are server-side
 *   backstops: one pathological query can no longer pin a connection for the
 *   lifetime of the instance.
 */
function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 20),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 15_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

/**
 * Cached in production too, not just in dev.
 *
 * In dev the reason is HMR. In production the reason is that Next bundles route
 * handlers separately, so this module can be evaluated more than once inside a
 * single instance — and each evaluation would otherwise open its own pool,
 * multiplying the connection count by the number of bundles that import it.
 */
globalForPrisma.prisma = prisma;
