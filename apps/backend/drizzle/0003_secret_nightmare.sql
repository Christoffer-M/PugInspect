CREATE TABLE "character_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"achievement_id" integer NOT NULL,
	"achievement_name" varchar(200) NOT NULL,
	"completed_timestamp" bigint,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id_a" uuid NOT NULL,
	"character_id_b" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_achievements" ADD CONSTRAINT "character_achievements_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_links" ADD CONSTRAINT "character_links_character_id_a_characters_id_fk" FOREIGN KEY ("character_id_a") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_links" ADD CONSTRAINT "character_links_character_id_b_characters_id_fk" FOREIGN KEY ("character_id_b") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "char_achievements_char_ach_unique" ON "character_achievements" USING btree ("character_id","achievement_id");--> statement-breakpoint
CREATE INDEX "char_achievements_lookup_idx" ON "character_achievements" USING btree ("achievement_id","completed_timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "character_links_pair_unique" ON "character_links" USING btree ("character_id_a","character_id_b");--> statement-breakpoint
CREATE INDEX "character_links_a_idx" ON "character_links" USING btree ("character_id_a");--> statement-breakpoint
CREATE INDEX "character_links_b_idx" ON "character_links" USING btree ("character_id_b");