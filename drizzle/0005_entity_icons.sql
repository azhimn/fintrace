ALTER TABLE "accounts" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "hue" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "hue" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "envelopes" ADD COLUMN "icon" text;--> statement-breakpoint
-- Existing Funds and categories get a spread of pastels from their sort order, as Budgets did.
UPDATE "accounts" SET "hue" = "sort_order" % 6;--> statement-breakpoint
UPDATE "categories" SET "hue" = "sort_order" % 6;
