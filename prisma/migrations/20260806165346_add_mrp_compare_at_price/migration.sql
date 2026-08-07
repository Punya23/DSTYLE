-- Optional compare-at ("MRP") price on products and variants.
--
-- Purely additive: both columns are nullable with no default, so every one of
-- the rows already in the catalogue stays valid and simply shows no discount
-- until an admin fills the field in.
--
-- NOTE: this database predates `prisma migrate` and has no `_prisma_migrations`
-- history (`prisma migrate status` reports "not managed by Prisma Migrate"), so
-- this file was applied by hand rather than by `migrate dev` — running that
-- would have demanded a baseline or a full reset of live data. The statements
-- are guarded with IF NOT EXISTS so re-applying them, or replaying this
-- migration after someone baselines the database, is a no-op rather than an
-- error.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(10,2);
ALTER TABLE "SKU" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(10,2);
