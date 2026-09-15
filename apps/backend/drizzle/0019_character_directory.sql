CREATE TABLE "character_directory" (
	"region" varchar(2) NOT NULL,
	"realm" varchar(100) NOT NULL,
	"name" varchar(50) NOT NULL,
	"spec_id" integer,
	"last_seen_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_directory_region_realm_name_pk" PRIMARY KEY("region","realm","name")
);
--> statement-breakpoint
CREATE INDEX "character_directory_name_prefix_idx" ON "character_directory" USING btree ("name" text_pattern_ops);