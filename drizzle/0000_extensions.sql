-- Must run before the schema migration: the transactions.item index needs gin_trgm_ops.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
