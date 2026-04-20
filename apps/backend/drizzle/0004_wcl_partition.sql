DROP INDEX "wcl_snapshots_char_query_unique";

--> statement-breakpoint
ALTER TABLE "character_wcl_snapshots"
ADD COLUMN "partition" integer DEFAULT 0 NOT NULL;

--> statement-breakpoint
CREATE UNIQUE INDEX "wcl_snapshots_char_query_unique" ON "character_wcl_snapshots" USING btree (
    "character_id",
    "zone_id",
    "difficulty",
    "metric",
    "role",
    "by_bracket",
    "partition"
);