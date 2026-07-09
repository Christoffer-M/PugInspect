CREATE TABLE "character_equipment_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"raw_data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_equipment_snapshots" ADD CONSTRAINT "character_equipment_snapshots_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_snapshots_character_unique" ON "character_equipment_snapshots" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "equipment_snapshots_character_expires_idx" ON "character_equipment_snapshots" USING btree ("character_id","expires_at");