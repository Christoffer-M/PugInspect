ALTER TABLE "companion_beats" ADD COLUMN "update_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "companion_beats" ADD COLUMN "update_pending" varchar(16);