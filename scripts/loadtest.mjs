/**
 * Storefront load test.
 *
 *   npm run build && npm run start          # in one terminal
 *   node scripts/loadtest.mjs               # in another
 *   node scripts/loadtest.mjs --url=https://dstyle.in --conn=200
 *
 * Runs each hot route at a ladder of concurrencies and prints latency
 * percentiles, throughput and the non-2xx count.
 *
 * What this can and cannot tell you:
 *
 *   CAN  — whether a route is served from cache or re-renders per request,
 *          whether the Postgres pool saturates, which route is the slowest,
 *          and where latency stops scaling linearly with concurrency.
 *   CANNOT — how Vercel behaves. Locally every request lands on one Node
 *          process; on Fluid Compute they fan out across instances. A route
 *          that degrades here degrades there too, but the absolute numbers
 *          will not match. Treat the *shape* of the curve as the signal.
 *
 * The ladder deliberately stops at 500 connections from a single client: past
 * that the loopback interface and the client's own event loop become the
 * bottleneck and the numbers stop measuring the server.
 */

import autocannon from "autocannon";

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = (arg("url", "http://localhost:3000")).replace(/\/$/, "");
const DURATION = Number(arg("duration", "10"));
const LADDER = arg("conn", "")
  ? [Number(arg("conn", "50"))]
  : [50, 150, 300];

/**
 * The routes a real visitor actually hits, in rough order of traffic share.
 * `/api/products` is included because the client-side catalogue filter calls it
 * on every facet change — it takes more load than any single page.
 */
const ROUTES = [
  { name: "home            /", path: "/" },
  { name: "collections     /collections", path: "/collections" },
  { name: "collection      /collections/bridal", path: "/collections/bridal" },
  { name: "pdp             /products/…", path: null },
  { name: "catalogue API   /api/products", path: "/api/products?limit=24" },
];

/** Resolve a real product slug so the PDP row tests an existing page. */
async function resolvePdp() {
  try {
    const res = await fetch(`${BASE}/api/products?limit=1`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    const slug = body?.products?.[0]?.slug ?? body?.[0]?.slug;
    return slug ? `/products/${slug}` : null;
  } catch {
    return null;
  }
}

function run(url, connections) {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections,
        duration: DURATION,
        // A browser sends this and it changes what the server negotiates
        // (compression, image format); without it the numbers are optimistic.
        headers: {
          "accept-encoding": "gzip, br",
          "user-agent": "dstyle-loadtest/1.0",
        },
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
  });
}

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

async function main() {
  // Fail fast rather than reporting 100% errors as a performance result.
  try {
    const probe = await fetch(BASE, { method: "HEAD" });
    if (!probe.ok && probe.status >= 500) throw new Error(`origin returned ${probe.status}`);
  } catch (err) {
    console.error(`Cannot reach ${BASE} — start the server first (npm run build && npm run start).`);
    console.error(String(err?.message ?? err));
    process.exit(1);
  }

  const pdp = await resolvePdp();
  const routes = ROUTES.map((r) => (r.path === null ? { ...r, path: pdp } : r)).filter((r) => r.path);
  if (!pdp) console.warn("! could not resolve a product slug — skipping the PDP row\n");

  console.log(`target ${BASE}   ${DURATION}s per step   ladder ${LADDER.join(", ")}\n`);
  console.log(
    `${pad("route", 34)}${num("conn", 6)}${num("req/s", 10)}${num("p50", 8)}${num("p97.5", 8)}${num("p99", 8)}${num("max", 8)}${num("non2xx", 9)}`
  );
  console.log("-".repeat(91));

  const rows = [];

  for (const route of routes) {
    for (const connections of LADDER) {
      const r = await run(`${BASE}${route.path}`, connections);
      const nonOk = r.non2xx + (r.errors ?? 0) + (r.timeouts ?? 0);
      rows.push({ route: route.name, connections, rps: r.requests.average, p99: r.latency.p99, nonOk });
      console.log(
        pad(route.name, 34) +
          num(connections, 6) +
          num(Math.round(r.requests.average), 10) +
          num(`${r.latency.p50}ms`, 8) +
          num(`${r.latency.p97_5}ms`, 8) +
          num(`${r.latency.p99}ms`, 8) +
          num(`${r.latency.max}ms`, 8) +
          num(nonOk, 9)
      );
    }
    console.log("");
  }

  // The one number that matters: does latency grow faster than concurrency?
  // A cached route holds p99 roughly flat as connections rise; a route that
  // re-renders and re-queries per request grows superlinearly, and that is the
  // one that will take the site down.
  console.log("\nscaling (p99 at highest step vs lowest):");
  for (const route of routes) {
    const low = rows.find((x) => x.route === route.name && x.connections === LADDER[0]);
    const high = rows.find((x) => x.route === route.name && x.connections === LADDER[LADDER.length - 1]);
    if (!low || !high || !low.p99) continue;
    const factor = high.p99 / low.p99;
    const concurrencyFactor = LADDER[LADDER.length - 1] / LADDER[0];
    const verdict =
      factor > concurrencyFactor ? "SUPERLINEAR — investigate" : factor > concurrencyFactor * 0.6 ? "linear" : "flat (cached)";
    console.log(`  ${pad(route.name, 34)} x${factor.toFixed(1)} latency for x${concurrencyFactor} load   ${verdict}`);
  }

  const broken = rows.filter((r) => r.nonOk > 0);
  if (broken.length) {
    console.log("\nnon-2xx responses were returned — the numbers above are not a clean result:");
    for (const b of broken) console.log(`  ${b.route} @ ${b.connections} conn: ${b.nonOk}`);
    process.exitCode = 1;
  }
}

await main();
