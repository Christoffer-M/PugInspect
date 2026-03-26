CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" varchar(2) NOT NULL,
	"realm" varchar(100) NOT NULL,
	"name" varchar(50) NOT NULL,
	"class" varchar(50),
	"specialization" varchar(50),
	"race" varchar(50),
	"thumbnail_url" text,
	"item_level" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_rio_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"raw_data" jsonb NOT NULL,
	"mythic_plus_score" real
);
--> statement-breakpoint
CREATE TABLE "character_wcl_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"zone_id" integer DEFAULT 0 NOT NULL,
	"difficulty" varchar(10) DEFAULT '' NOT NULL,
	"metric" varchar(5) DEFAULT '' NOT NULL,
	"role" varchar(10) DEFAULT '' NOT NULL,
	"by_bracket" boolean DEFAULT false NOT NULL,
	"best_performance_avg" real,
	"median_performance_avg" real,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"raw_data" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_rio_snapshots" ADD CONSTRAINT "character_rio_snapshots_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "character_wcl_snapshots" ADD CONSTRAINT "character_wcl_snapshots_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "characters_region_realm_name_unique" ON "characters" USING btree ("region","realm","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "rio_snapshots_character_unique" ON "character_rio_snapshots" USING btree ("character_id");
--> statement-breakpoint
CREATE INDEX "rio_snapshots_character_expires_idx" ON "character_rio_snapshots" USING btree ("character_id","expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "wcl_snapshots_char_query_unique" ON "character_wcl_snapshots" USING btree ("character_id","zone_id","difficulty","metric","role","by_bracket");
--> statement-breakpoint
CREATE INDEX "wcl_snapshots_character_expires_idx" ON "character_wcl_snapshots" USING btree ("character_id","expires_at");
--> statement-breakpoint
CREATE INDEX "wcl_snapshots_character_fetched_idx" ON "character_wcl_snapshots" USING btree ("character_id","fetched_at");
