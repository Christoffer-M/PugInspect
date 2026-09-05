CREATE TABLE "companion_beats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"install_id" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" varchar(16) NOT NULL,
	"link" varchar(16) NOT NULL,
	"listing" varchar(8) NOT NULL,
	"region" varchar(8),
	"applicants" integer NOT NULL,
	"total" integer NOT NULL,
	"lookups" integer NOT NULL,
	"lookup_errors" integer NOT NULL,
	"not_found" integer NOT NULL,
	"settings" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companion_installs" (
	"install_id" uuid PRIMARY KEY NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"version" varchar(16) NOT NULL,
	"region" varchar(8),
	"country" varchar(2),
	"activated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "companion_beats_at_idx" ON "companion_beats" USING btree ("at");--> statement-breakpoint
CREATE INDEX "companion_beats_install_at_idx" ON "companion_beats" USING btree ("install_id","at");--> statement-breakpoint
CREATE INDEX "companion_installs_last_seen_idx" ON "companion_installs" USING btree ("last_seen");