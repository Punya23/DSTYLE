-- Marketing email list.
--
-- Purely additive: a new table, no change to anything that already exists.
--
-- NOTE: this database predates `prisma migrate` and has no `_prisma_migrations`
-- history, so — following the convention of the migration before it — this file
-- is applied by hand rather than by `migrate dev`. Every statement is guarded
-- with IF NOT EXISTS so re-applying it, or replaying it after someone baselines
-- the database, is a no-op rather than an error.

CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
    "id"               TEXT         NOT NULL,
    "email"            TEXT         NOT NULL,
    "source"           TEXT         NOT NULL DEFAULT 'footer',
    "unsubscribedAt"   TIMESTAMP(3),
    "unsubscribeToken" TEXT         NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- One row per address: the upsert in `/api/newsletter` relies on this to make a
-- repeat signup a resurrection rather than a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_email_key"
    ON "NewsletterSubscriber" ("email");

-- The unsubscribe link carries this token; it has to be a unique lookup key.
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_unsubscribeToken_key"
    ON "NewsletterSubscriber" ("unsubscribeToken");

-- Sending a campaign reads "everyone still subscribed", i.e. NULL here.
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_unsubscribedAt_idx"
    ON "NewsletterSubscriber" ("unsubscribedAt");
