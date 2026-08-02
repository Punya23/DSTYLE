-- Order status vocabulary change: CONFIRMED/PROCESSING/RETURNED are now
-- PAID/PACKED/REFUNDED.
--
-- Run this ONCE against any database that already holds orders, BEFORE
-- `prisma db push`. Renaming the enum values in place preserves every existing
-- row; letting `db push` drop and recreate the type would not.
--
--   psql "$DATABASE_URL" -f prisma/sql/2026-08-02-order-status-rename.sql
--
-- Safe to run on a fresh database too — each statement is guarded, so a value
-- that has already been renamed (or never existed) is skipped rather than
-- erroring out.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'CONFIRMED'
  ) THEN
    ALTER TYPE "OrderStatus" RENAME VALUE 'CONFIRMED' TO 'PAID';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PROCESSING'
  ) THEN
    ALTER TYPE "OrderStatus" RENAME VALUE 'PROCESSING' TO 'PACKED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'RETURNED'
  ) THEN
    ALTER TYPE "OrderStatus" RENAME VALUE 'RETURNED' TO 'REFUNDED';
  END IF;
END
$$;
