ALTER TABLE "envelopes" ADD COLUMN "hue" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Existing Budgets keep the pastel they had, which came from sort order.
UPDATE "envelopes" SET "hue" = "sort_order" % 6;
