CREATE TABLE "mplus_spec_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" integer NOT NULL,
	"key_floor" integer NOT NULL,
	"encounter_id" integer DEFAULT 0 NOT NULL,
	"class_slug" varchar(24) NOT NULL,
	"spec_slug" varchar(24) NOT NULL,
	"role" varchar(8) NOT NULL,
	"metric" varchar(8) NOT NULL,
	"parses" integer NOT NULL,
	"median" real NOT NULL,
	"p95" real NOT NULL,
	"max" real NOT NULL,
	"median_key" integer NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mplus_stats_meta" (
	"zone_id" integer PRIMARY KEY NOT NULL,
	"key_levels" jsonb NOT NULL,
	"total_parses" integer NOT NULL,
	"dungeons" jsonb NOT NULL,
	"requests" integer NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mplus_spec_stats_unique" ON "mplus_spec_stats" USING btree ("zone_id","key_floor","encounter_id","class_slug","spec_slug");--> statement-breakpoint
CREATE INDEX "mplus_spec_stats_lookup_idx" ON "mplus_spec_stats" USING btree ("zone_id","key_floor","encounter_id");