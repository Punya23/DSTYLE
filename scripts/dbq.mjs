/**
 * Ad-hoc read-only query helper against the live database.
 *
 *   node --env-file=.env scripts/dbq.mjs "SELECT ..."
 *
 * Operator tool, not a runtime dependency. Talks to Postgres through `pg`
 * rather than the generated Prisma client, so it keeps working regardless of
 * which Prisma generator (JS or the TS-first one) the project is on.
 *
 * Refuses anything that is not a single SELECT/WITH, so a typo can never
 * mutate the catalogue.
 */
import pg from "pg";

const sql = process.argv[2];
if (!sql) {
  console.error('usage: node --env-file=.env scripts/dbq.mjs "SELECT 1"');
  process.exit(1);
}

const head = sql.trim().replace(/^[("\s]+/, "").slice(0, 6).toUpperCase();
if (!(head.startsWith("SELECT") || head.startsWith("WITH"))) {
  console.error("refusing: only SELECT / WITH are allowed");
  process.exit(1);
}
if (/;\s*\S/.test(sql)) {
  console.error("refusing: multiple statements");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error("QUERY FAILED:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
