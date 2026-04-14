CREATE TABLE "character_blizzard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"raw_data" jsonb NOT NULL,
	"equipped_item_level" real
);
--> statement-breakpoint
ALTER TABLE "character_blizzard_snapshots"
	ADD CONSTRAINT "character_blizzard_snapshots_character_id_characters_id_fk"
	FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "blizzard_snapshots_character_unique" ON "character_blizzard_snapshots" ("character_id");
--> statement-breakpoint
CREATE INDEX "blizzard_snapshots_character_expires_idx" ON "character_blizzard_snapshots" ("character_id","expires_at");
