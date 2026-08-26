DROP INDEX "mplus_spec_stats_unique";--> statement-breakpoint
ALTER TABLE "mplus_spec_stats" ADD COLUMN "hero_talent" varchar(32) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "mplus_spec_stats_unique" ON "mplus_spec_stats" USING btree ("zone_id","key_floor","encounter_id","class_slug","spec_slug","metric","hero_talent");